import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/my', '/report', '/saved-areas'];
const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Redirect authenticated users away from auth pages
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && accessToken) {
    return NextResponse.redirect(new URL('/my', request.url));
  }

  // Redirect unauthenticated users to login
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/my/:path*', '/report/:path*', '/saved-areas/:path*', '/login', '/register'],
};
