export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-16">
        <h2 className="text-4xl font-bold mb-4">Report civic issues. Get them resolved.</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Submit complaints with photos and location, track progress in real time,
          and hold your local government accountable.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/report" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Report an issue
          </a>
          <a href="/track" className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-100">
            Track complaint
          </a>
        </div>
      </section>
    </div>
  );
}
