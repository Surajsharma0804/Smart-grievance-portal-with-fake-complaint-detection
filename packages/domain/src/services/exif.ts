/**
 * EXIF metadata extraction and normalization.
 * Uses exifr for parsing EXIF data from image buffers.
 */

export interface ExifSummary {
  gps?: { lat: number; lng: number };
  captureTime?: Date;
  make?: string;
  model?: string;
  software?: string;
}

/** Known editing software tags that indicate post-processing. */
export const EDITING_SOFTWARE = [
  'photoshop', 'gimp', 'snapseed', 'lightroom', 'afterlight',
  'vsco', 'pixlr', 'canva', 'picsart', 'facetune',
] as const;

/**
 * Extract and normalize EXIF data from an image buffer.
 * Returns a typed ExifSummary. Handles missing/malformed data gracefully.
 */
export async function extractExif(buffer: Buffer): Promise<ExifSummary> {
  try {
    // Dynamic import to avoid issues when exifr is not installed
    const exifr = await import('exifr');
    const data = await exifr.parse(buffer, {
      pick: ['GPSLatitude', 'GPSLongitude', 'DateTimeOriginal', 'Make', 'Model', 'Software'],
    });

    if (!data) return {};

    const summary: ExifSummary = {};

    // GPS
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      summary.gps = { lat: data.latitude, lng: data.longitude };
    }

    // Capture time
    if (data.DateTimeOriginal instanceof Date) {
      summary.captureTime = data.DateTimeOriginal;
    } else if (typeof data.DateTimeOriginal === 'string') {
      const parsed = new Date(data.DateTimeOriginal);
      if (!isNaN(parsed.getTime())) {
        summary.captureTime = parsed;
      }
    }

    // Device info
    if (typeof data.Make === 'string') summary.make = data.Make.trim();
    if (typeof data.Model === 'string') summary.model = data.Model.trim();
    if (typeof data.Software === 'string') summary.software = data.Software.trim();

    return summary;
  } catch {
    // Gracefully handle any parsing errors
    return {};
  }
}

/**
 * Check if EXIF software tag indicates editing software was used.
 */
export function hasEditingSoftware(summary: ExifSummary): boolean {
  if (!summary.software) return false;
  const lower = summary.software.toLowerCase();
  return EDITING_SOFTWARE.some((sw) => lower.includes(sw));
}
