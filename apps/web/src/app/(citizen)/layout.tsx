export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="flex items-center justify-between py-4 border-b">
        <h1 className="text-xl font-semibold">Nagrik Setu</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/my" className="hover:underline">My complaints</a>
          <a href="/report" className="hover:underline">Report</a>
          <a href="/nearby" className="hover:underline">Nearby</a>
        </nav>
      </header>
      <main className="py-6">{children}</main>
    </div>
  );
}
