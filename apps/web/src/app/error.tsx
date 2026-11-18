'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center">
        <div className="text-7xl mb-4">⚠️</div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Something Went Wrong</h1>
        <p className="text-gray-500 mt-3 max-w-md mx-auto text-sm">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-300 font-mono mt-2">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all"
      >
        🔄 Try Again
      </button>
    </div>
  );
}
