'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { complaintCreateSchema } from '@nagrik-setu/shared';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export interface ReportState {
  error?: string;
  fieldErrors?: Record<string, string>;
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
