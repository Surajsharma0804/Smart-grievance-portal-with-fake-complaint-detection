import type { StorageDriver } from './storage';

/** Allowed upload MIME types and their magic byte signatures. */
const ALLOWED_TYPES: Record<string, { magicBytes: number[][]; maxBytes: number }> = {
  'image/jpeg': {
    magicBytes: [[0xff, 0xd8, 0xff]],
    maxBytes: 10 * 1024 * 1024, // 10 MB
  },
  'image/png': {
    magicBytes: [[0x89, 0x50, 0x4e, 0x47]],
    maxBytes: 10 * 1024 * 1024,
  },
  'image/webp': {
    // RIFF....WEBP
    magicBytes: [[0x52, 0x49, 0x46, 0x46]],
    maxBytes: 10 * 1024 * 1024,
  },
};

const PRESIGN_EXPIRY_SEC = 300; // 5 minutes
const MAX_IMAGES_PER_COMPLAINT = 4;

export interface PresignRequest {
  contentType: string;
  fileSize: number;
}

export interface PresignResult {
  url: string;
  key: string;
  expiresAt: Date;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates the content type and size before generating a presigned URL.
 */
export function validatePresignRequest(req: PresignRequest): VerifyResult {
  const typeInfo = ALLOWED_TYPES[req.contentType];
  if (!typeInfo) {
    return {
      valid: false,
      reason: `Unsupported file type: ${req.contentType}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
    };
  }
  if (req.fileSize > typeInfo.maxBytes) {
    return {
      valid: false,
      reason: `File too large: ${req.fileSize} bytes. Maximum: ${typeInfo.maxBytes} bytes (${typeInfo.maxBytes / 1024 / 1024} MB)`,
    };
  }
  if (req.fileSize <= 0) {
    return { valid: false, reason: 'File size must be positive' };
  }
  return { valid: true };
}

/**
 * Generate presigned upload URLs for a batch of files.
 */
export async function generatePresignedUrls(
  storage: StorageDriver,
  requests: PresignRequest[],
): Promise<PresignResult[]> {
  if (requests.length === 0) {
    throw new Error('At least one file is required');
  }
  if (requests.length > MAX_IMAGES_PER_COMPLAINT) {
    throw new Error(`Maximum ${MAX_IMAGES_PER_COMPLAINT} images allowed`);
  }

  for (const req of requests) {
    const result = validatePresignRequest(req);
    if (!result.valid) {
      throw new Error(result.reason);
    }
  }

  const results: PresignResult[] = [];
  for (const req of requests) {
    const presigned = await storage.presignPut({
      contentType: req.contentType,
      maxBytes: ALLOWED_TYPES[req.contentType]!.maxBytes,
      expiresInSec: PRESIGN_EXPIRY_SEC,
    });
    results.push({
      url: presigned.url,
      key: presigned.key,
      expiresAt: presigned.expiresAt,
    });
  }
  return results;
}

/**
 * Verify that a magic byte signature matches the claimed content type.
 * Returns the detected type or null if it doesn't match any known type.
 */
export function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  for (const [mime, info] of Object.entries(ALLOWED_TYPES)) {
    for (const sig of info.magicBytes) {
      if (buffer.length >= sig.length && sig.every((b, i) => buffer[i] === b)) {
        // WebP needs an additional check for the WEBP signature at offset 8
        if (mime === 'image/webp') {
          if (
            buffer.length >= 12 &&
            buffer[8] === 0x57 && // W
            buffer[9] === 0x45 && // E
            buffer[10] === 0x42 && // B
            buffer[11] === 0x50   // P
          ) {
            return mime;
          }
          continue;
        }
        return mime;
      }
    }
  }
  return null;
}

/**
 * Verify an uploaded file after the client reports it was uploaded.
 * Checks size, content type via HEAD, and magic bytes via content.
 */
export async function verifyUpload(
  storage: StorageDriver,
  key: string,
  expectedContentType: string,
): Promise<VerifyResult> {
  // Check the file exists and get metadata
  const head = await storage.head(key);
  if (!head) {
    return { valid: false, reason: 'File not found in storage' };
  }

  // Check size limits
  const typeInfo = ALLOWED_TYPES[expectedContentType];
  if (!typeInfo) {
    return { valid: false, reason: `Unsupported content type: ${expectedContentType}` };
  }
  if (head.size > typeInfo.maxBytes) {
    return { valid: false, reason: `File exceeds size limit: ${head.size} bytes` };
  }

  // Read the first 12 bytes to check magic bytes
  const buffer = await storage.getBuffer(key);
  const detectedMime = detectMimeFromMagicBytes(buffer);
  if (!detectedMime) {
    return { valid: false, reason: 'File content does not match any allowed image format' };
  }
  if (detectedMime !== expectedContentType) {
    return {
      valid: false,
      reason: `Content type mismatch: claimed ${expectedContentType}, detected ${detectedMime}`,
    };
  }

  return { valid: true };
}

export const ALLOWED_CONTENT_TYPES = Object.keys(ALLOWED_TYPES);
export const MAX_FILE_SIZE = Math.max(...Object.values(ALLOWED_TYPES).map((t) => t.maxBytes));
