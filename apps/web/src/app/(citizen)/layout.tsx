import Link from 'next/link';
import { getSession, logoutAction } from '@/lib/auth-actions';

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-7xl px-4" suppressHydrationWarning>
      <header className="flex items-center justify-between py-4 border-b">
        <Link href="/" className="text-xl font-semibold">Nagrik Setu</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/my" className="hover:underline">My complaints</Link>
          <Link href="/report" className="hover:underline font-medium text-blue-600">Report</Link>
          <Link href="/nearby" className="hover:underline">Nearby</Link>
          <Link href="/saved-areas" className="hover:underline">Saved areas</Link>
          {session && ['OFFICER', 'DEPT_ADMIN', 'REVIEWER'].includes(session.user.role) && (
            <Link
              href="/staff"
              className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded font-medium border border-blue-200"
            >
              Staff Console
            </Link>
          )}
          {session && (
            <form action={logoutAction}>
              <button type="submit" className="text-gray-500 hover:text-gray-700">
                Sign out
              </button>
            </form>
          )}
        </nav>
      </header>
      <main className="py-6">{children}</main>
    </div>
  );
}
