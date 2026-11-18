import Link from 'next/link';
import { getSession, logoutAction } from '@/lib/auth-actions';
import { SiteFooter } from '../(public)/SiteShell';

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50" suppressHydrationWarning>
      {/* Authenticated header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">🏛️</span>
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Nagrik Setu</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/my" className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors">
              My Complaints
            </Link>
            <Link href="/report" className="px-3 py-1.5 rounded-lg text-blue-700 bg-blue-50 font-medium transition-colors hover:bg-blue-100">
              Report
            </Link>
            <Link href="/nearby" className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors hidden sm:block">
              Nearby
            </Link>
            <Link href="/saved-areas" className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors hidden sm:block">
              Saved Areas
            </Link>
            {session && ['OFFICER', 'DEPT_ADMIN', 'REVIEWER'].includes(session.user.role) && (
              <Link
                href="/staff"
                className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg font-medium border border-gray-200 transition-colors hidden sm:flex items-center gap-1"
              >
                <span className="text-[10px]">🔒</span> Staff
              </Link>
            )}
            {session && (
              <form action={logoutAction} className="ml-1">
                <button type="submit" className="text-xs text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
