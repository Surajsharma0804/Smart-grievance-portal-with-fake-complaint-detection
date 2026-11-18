import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center">
        <div className="text-7xl mb-4">🔍</div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Page Not Found</h1>
        <p className="text-gray-500 mt-3 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all"
        >
          ← Go Home
        </Link>
        <Link
          href="/stats"
          className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          View Statistics
        </Link>
      </div>
    </div>
  );
}
