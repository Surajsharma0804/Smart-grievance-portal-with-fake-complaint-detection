import { cookies } from 'next/headers';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

/**
 * Server-side API fetch that forwards the user's auth cookies to Express.
 * Used in Server Components and Server Actions.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      ...init?.headers,
    },
  });
}
