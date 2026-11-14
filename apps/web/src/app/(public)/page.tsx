import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16" suppressHydrationWarning>
      <section className="text-center py-20">
        <h2 className="text-4xl font-bold mb-4 tracking-tight">
          Report civic issues. Get them resolved.
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Submit complaints with photos and location, track progress in real time,
          and see issues in your area being addressed.
        </p>
        <div className="mt-8 flex justify-center gap-4" suppressHydrationWarning>
          <Link
            href="/report"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Report an issue
          </Link>
          <Link
            href="/nearby"
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            View nearby
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-blue-600 text-xl">1</span>
          </div>
          <h3 className="font-semibold mb-1">Report</h3>
          <p className="text-sm text-gray-600">
            Take a photo, pin your location, and describe the problem. We will
            verify and route it automatically.
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl">2</span>
          </div>
          <h3 className="font-semibold mb-1">Track</h3>
          <p className="text-sm text-gray-600">
            Follow your complaint through every stage. Get notified when its status
            changes.
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-purple-600 text-xl">3</span>
          </div>
          <h3 className="font-semibold mb-1">Resolve</h3>
          <p className="text-sm text-gray-600">
            The assigned department works on the issue. Resolution is verified
            before the complaint is closed.
          </p>
        </div>
      </section>
    </div>
  );
}
