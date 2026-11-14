export default function MapSlot() {
  const points = [
    { id: 'NS-001', title: 'Pothole on Madhya Marg', category: 'ROADS', lat: '30.745° N', lng: '76.785° E' },
    { id: 'NS-002', title: 'Streetlight out Sector 17', category: 'STREET_LIGHTING', lat: '30.741° N', lng: '76.778° E' },
    { id: 'NS-003', title: 'Water leakage in Sector 22', category: 'WATER', lat: '30.732° N', lng: '76.768° E' },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b">
        <h3 className="font-semibold text-gray-800">Map View (Chandigarh Grid)</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">GPS Active</span>
      </div>
      <div className="relative bg-slate-100 rounded-lg h-80 flex flex-col items-center justify-center border border-dashed border-slate-300 p-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-sm font-bold shadow">
            📍
          </div>
          <p className="text-xs text-gray-500 font-medium">Center: 30.7333° N, 76.7794° E (Sector 17)</p>
        </div>
        <div className="absolute top-6 left-12 bg-white px-2.5 py-1 rounded shadow text-xs border border-blue-200">
          ⚠️ Pothole (ROADS)
        </div>
        <div className="absolute bottom-8 right-12 bg-white px-2.5 py-1 rounded shadow text-xs border border-amber-200">
          💡 Streetlight (LIGHTING)
        </div>
        <div className="absolute bottom-16 left-24 bg-white px-2.5 py-1 rounded shadow text-xs border border-cyan-200">
          💧 Pipe Leak (WATER)
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Markers:</h4>
        <div className="flex flex-wrap gap-2">
          {points.map((p) => (
            <span key={p.id} className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-700">
              {p.title} ({p.lat}, {p.lng})
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Public locations are rounded to ~111m grid to protect reporter privacy (NFR-4).
      </p>
    </div>
  );
}
