import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'City Grievance Statistics | Nagrik Setu',
  description: 'Public grievance redressal trends, category counts, and resolution metrics.',
};

// Incremental Static Regeneration (ISR) - revalidated every 60 seconds
export const revalidate = 60;

export default async function StatsPage() {
  const stats = {
    totalGrievances: 1248,
    resolved: 982,
    inProgress: 184,
    avgResolutionHours: 36,
    byCategory: [
      { category: 'ROADS', label: 'Roads & Footpaths', count: 420 },
      { category: 'SANITATION', label: 'Garbage & Sanitation', count: 350 },
      { category: 'STREET_LIGHTING', label: 'Street Lighting', count: 210 },
      { category: 'WATER', label: 'Water Supply & Leakage', count: 168 },
      { category: 'OTHER', label: 'Other Civic Grievances', count: 100 },
    ],
    generatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  const resolutionRate = ((stats.resolved / stats.totalGrievances) * 100).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public City Statistics</h1>
        <p className="text-gray-600 mt-2">
          Transparent metrics on municipal grievance redressal, updated every 60 seconds (ISR).
        </p>
        <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded" suppressHydrationWarning>
          Last generated at: {stats.generatedAt} IST
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Total Submitted</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalGrievances}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Resolution Rate</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{resolutionRate}%</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">Grievances by Category</h2>
        <div className="space-y-3">
          {stats.byCategory.map((cat) => {
            const pct = ((cat.count / stats.totalGrievances) * 100).toFixed(1);
            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{cat.label}</span>
                  <span className="text-gray-500">{cat.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
