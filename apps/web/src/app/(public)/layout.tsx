import { SiteHeader, SiteFooter } from './SiteShell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50" suppressHydrationWarning>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
