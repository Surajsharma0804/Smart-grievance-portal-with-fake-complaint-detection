import { getSession, logoutAction } from '@/lib/auth-actions';

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="flex items-center justify-between py-4 border-b">
        <a href="/" className="text-xl font-semibold">Nagrik Setu</a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/my" className="hover:underline">My complaints</a>
          <a href="/report" className="hover:underline font-medium text-blue-600">Report</a>
          <a href="/nearby" className="hover:underline">Nearby</a>
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
