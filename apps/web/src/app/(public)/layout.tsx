export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="flex items-center justify-between py-4 border-b">
        <h1 className="text-xl font-semibold">Nagrik Setu</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/" className="hover:underline">Home</a>
          <a href="/how-it-works" className="hover:underline">How it works</a>
          <a href="/nearby" className="hover:underline">Nearby</a>
        </nav>
      </header>
      <main className="py-6">{children}</main>
    </div>
  );
}
