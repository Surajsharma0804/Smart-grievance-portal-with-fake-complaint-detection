'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { complaintCreateSchema } from '@nagrik-setu/shared';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export interface ReportState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function getPresignedUploadUrlsAction(
  files: Array<{ contentType: string; fileSize: number }>,
): Promise<{ uploads?: Array<{ url: string; key: string; expiresAt: string }>; error?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) {
    return { error: 'Authentication required' };
  }

  const res = await fetch(`${API_URL}/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
    body: JSON.stringify({ files }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error?.message || 'Failed to get upload presigned URLs' };
  }

  return res.json();
}

export async function submitComplaintAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const raw = {
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || undefined,
    citizenCategory: (formData.get('citizenCategory') as string) || undefined,
    anonymous: formData.get('anonymous') === 'on',
    mediaKeys: (formData.get('mediaKeys') as string)?.split(',').filter(Boolean).length
      ? (formData.get('mediaKeys') as string).split(',').filter(Boolean)
      : ['placeholder-photo.jpg'],
    idempotencyKey: formData.get('idempotencyKey') as string,
    location: {
      type: 'Point' as const,
      coordinates: [
        parseFloat(formData.get('lng') as string),
        parseFloat(formData.get('lat') as string),
      ] as [number, number],
    },
  };

  const parsed = complaintCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  const res = await fetch(`${API_URL}/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error?.message || 'Failed to submit complaint' };
  }

  const body = await res.json();
  redirect(`/track/${body.complaint.publicId}`);
}

export async function upvoteComplaintAction(
  publicId: string,
): Promise<{ success: boolean; upvoted?: boolean; upvotes?: number; error?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return { success: false, error: 'Authentication required' };

  const res = await fetch(`${API_URL}/complaints/${publicId}/upvote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { success: false, error: body?.error?.message || 'Failed to update upvote' };
  }

  const data = await res.json();
  revalidatePath(`/track/${publicId}`);
  return { success: true, upvoted: data.upvoted, upvotes: data.upvotes };
}

export async function reopenComplaintAction(
  publicId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return { success: false, error: 'Authentication required' };

  const res = await fetch(`${API_URL}/complaints/${publicId}/reopen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { success: false, error: body?.error?.message || 'Failed to reopen complaint' };
  }

  revalidatePath(`/track/${publicId}`);
  return { success: true };
}

export async function submitFeedbackAction(
  publicId: string,
  rating: number,
  comment?: string,
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return { success: false, error: 'Authentication required' };

  const res = await fetch(`${API_URL}/complaints/${publicId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
    body: JSON.stringify({ rating, comment }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { success: false, error: body?.error?.message || 'Failed to submit feedback' };
  }

  revalidatePath(`/track/${publicId}`);
  return { success: true };
}

export async function appealComplaintAction(
  publicId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return { success: false, error: 'Authentication required' };

  const res = await fetch(`${API_URL}/complaints/${publicId}/appeal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { success: false, error: body?.error?.message || 'Failed to submit appeal' };
  }

  revalidatePath(`/track/${publicId}`);
  return { success: true };
}
