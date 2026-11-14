'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { registerSchema, loginSchema } from '@nagrik-setu/shared';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function forwardCookies(res: Response): Promise<void> {
  const setCookies = res.headers.getSetCookie();
  const cookieStore = await cookies();
  for (const header of setCookies) {
    const parts = header.split(';');
    const nameVal = parts[0] ?? '';
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx < 0) continue;
    const name = nameVal.slice(0, eqIdx).trim();
    const value = nameVal.slice(eqIdx + 1).trim();
    if (!name) continue;
    cookieStore.set(name, value, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: name === 'accessToken' ? 900 : 604800,
    });
  }
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { fieldErrors };
  }

  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error?.message || 'Registration failed' };
  }

  await forwardCookies(res);
  redirect('/my');
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { fieldErrors };
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error?.message || 'Login failed' };
  }

  await forwardCookies(res);
  redirect('/my');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `accessToken=${accessToken}`,
      },
    }).catch(() => {});
  }

  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  redirect('/login');
}

export async function getSession(): Promise<{
  user: { id: string; name: string; email: string; role: string };
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return null;

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Cookie: `accessToken=${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();
}
