import Link from 'next/link';

export default function ListSlot() {
  const issues = [
    {
      publicId: 'NS-8A39F1C0',
      title: 'Pothole on Madhya Marg near roundabout',
      category: 'ROADS',
      status: 'IN_PROGRESS',
      distance: '180m away',
      upvotes: 14,
    },
    {
      publicId: 'NS-94C2B7A1',
      title: 'Streetlight pole dark for 4 days',
      category: 'STREET_LIGHTING',
      status: 'ASSIGNED',
      distance: '350m away',
      upvotes: 6,
    },
    {
      publicId: 'NS-5D12E489',
      title: 'Pipeline burst causing waterlogging on service road',
      category: 'WATER',
      status: 'ROUTED',
      distance: '620m away',
      upvotes: 9,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Recent Issues List</h3>
        <span className="text-xs text-gray-500">Sorted by distance</span>
      </div>

      {issues.map((item) => (
        <div
          key={item.publicId}
          className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-medium text-gray-900 text-sm leading-snug">{item.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
              {item.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span className="font-medium text-gray-700">🏷️ {item.category}</span>
            <span>📍 {item.distance}</span>
            <Link
              href={`/track/${item.publicId}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Track issue →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
