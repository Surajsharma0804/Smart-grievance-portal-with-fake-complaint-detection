import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'City Grievance Statistics | Nagrik Setu',
  description: 'Public grievance redressal trends, category counts, and resolution metrics.',
};

export const revalidate = 60;

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface AnalyticsSummary {
  totalComplaints: number;
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  overdueComplaints: number;
}

async function fetchPublicStats(): Promise<AnalyticsSummary | null> {
  try {
    const res = await fetch(`${API_URL}/public/stats`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.summary;
  } catch {
    return null;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  SANITATION: 'Garbage & Sanitation',
  ROADS: 'Roads & Footpaths',
  WATER: 'Water Supply & Leakage',
  ELECTRICITY: 'Electricity & Wiring',
  STREET_LIGHTING: 'Street Lighting',
  TRAFFIC: 'Traffic Management',
  PARKS: 'Parks & Gardens',
  PUBLIC_HEALTH: 'Public Health',
  STRAY_ANIMALS: 'Stray Animals',
  ENCROACHMENT: 'Encroachment',
  OTHER: 'Other Civic Issues',
};

export default async function StatsPage() {
  const summary = await fetchPublicStats();

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public City Statistics</h1>
          <p className="text-gray-600 mt-2">Real-time municipal grievance metrics.</p>
        </div>
        <div className="p-12 text-center bg-white border rounded-xl">
          <p className="text-gray-500">Statistics are currently unavailable. The API may be warming up — please try again in a moment.</p>
        </div>
      </div>
    );
  }

  const total = summary.totalComplaints || 0;
  const resolved = (summary.statusCounts['RESOLVED'] || 0) + (summary.statusCounts['CLOSED'] || 0);
  const inProgress = (summary.statusCounts['IN_PROGRESS'] || 0) + (summary.statusCounts['ASSIGNED'] || 0);
  const overdue = summary.overdueComplaints || 0;
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

  const categoryEntries = Object.entries(summary.categoryCounts || {})
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public City Statistics</h1>
        <p className="text-gray-600 mt-2">
          Real-time municipal grievance redressal metrics, updated live from the database.
        </p>
        <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded font-medium">
          ● Live data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Total Submitted</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{resolved}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{inProgress}</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">Resolution Rate</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{resolutionRate}%</p>
        </div>
      </div>

      {overdue > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
          <span>⚠️</span>
          <span><strong>{overdue}</strong> complaint{overdue !== 1 ? 's' : ''} past SLA deadline.</span>
        </div>
      )}

      {/* Status Breakdown */}
      {Object.keys(summary.statusCounts).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">By Status</h2>
          <div className="space-y-3">
            {Object.entries(summary.statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{status}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.max(2, Number(pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Grievances by Category</h2>
          <div className="space-y-3">
            {categoryEntries.map(([cat, count]) => {
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.max(2, Number(pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
