export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-teal-200 rounded-full" />
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-teal-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium animate-pulse">Loading...</p>
    </div>
  );
}
