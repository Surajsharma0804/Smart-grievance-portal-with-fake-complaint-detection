import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.SESSION_VERIFY_SECRET || 'dev-secret';

  if (secret !== expectedSecret) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get('tag');
  const path = request.nextUrl.searchParams.get('path');

  if (tag) {
    revalidateTag(tag);
    return NextResponse.json({ revalidated: true, tag, now: Date.now() });
  }

  if (path) {
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path, now: Date.now() });
  }

  return NextResponse.json({ message: 'Missing tag or path' }, { status: 400 });
}
