export default function NearbyLayout({
  children,
  map,
  list,
}: {
  children: React.ReactNode;
  map: React.ReactNode;
  list: React.ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nearby Civic Grievances</h1>
        <p className="text-gray-600 mt-1">Live issues reported around Chandigarh municipal wards.</p>
      </div>
      {children}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-h-[450px]">
          {map}
        </div>
        <div className="space-y-4">
          {list}
        </div>
      </div>
    </div>
  );
}
