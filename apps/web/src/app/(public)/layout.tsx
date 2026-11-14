import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="flex items-center justify-between py-4 border-b">
        <Link href="/" className="text-xl font-semibold">Nagrik Setu</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/how-it-works" className="hover:underline">How it works</Link>
          <Link href="/stats" className="hover:underline">City Stats</Link>
          <Link href="/departments" className="hover:underline">Departments</Link>
          <Link href="/nearby" className="hover:underline">Nearby issues</Link>
          <Link href="/login" className="hover:underline">Sign in</Link>
          <Link
            href="/register"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Register
          </Link>
        </nav>
      </header>
      <main className="py-6">{children}</main>
    </div>
  );
}
