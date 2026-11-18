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
    const res = await fetch(`${API_URL}/public/stats`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.summary;
  } catch {
    return null;
  }
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  SANITATION: { label: 'Garbage & Sanitation', icon: '🧹', color: 'bg-amber-500' },
  ROADS: { label: 'Roads & Footpaths', icon: '🛣️', color: 'bg-gray-500' },
  WATER: { label: 'Water Supply & Leakage', icon: '💧', color: 'bg-blue-500' },
  ELECTRICITY: { label: 'Electricity & Wiring', icon: '⚡', color: 'bg-yellow-500' },
  STREET_LIGHTING: { label: 'Street Lighting', icon: '💡', color: 'bg-orange-400' },
  TRAFFIC: { label: 'Traffic Management', icon: '🚦', color: 'bg-red-500' },
  PARKS: { label: 'Parks & Gardens', icon: '🌳', color: 'bg-green-500' },
  PUBLIC_HEALTH: { label: 'Public Health', icon: '🏥', color: 'bg-rose-500' },
  STRAY_ANIMALS: { label: 'Stray Animals', icon: '🐕', color: 'bg-orange-500' },
  ENCROACHMENT: { label: 'Encroachment', icon: '🏗️', color: 'bg-slate-500' },
  OTHER: { label: 'Other Civic Issues', icon: '📋', color: 'bg-slate-500' },
};

const STATUS_STYLES: Record<string, { label: string; color: string; barColor: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'text-teal-700', barColor: 'bg-teal-500' },
  ANALYZING: { label: 'Analyzing', color: 'text-yellow-700', barColor: 'bg-yellow-500' },
  NEEDS_REVIEW: { label: 'Under Review', color: 'text-orange-700', barColor: 'bg-orange-500' },
  ROUTED: { label: 'Routed', color: 'text-sky-700', barColor: 'bg-sky-500' },
  ASSIGNED: { label: 'Assigned', color: 'text-cyan-700', barColor: 'bg-cyan-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-teal-700', barColor: 'bg-teal-500' },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', barColor: 'bg-green-500' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', barColor: 'bg-gray-400' },
  REOPENED: { label: 'Reopened', color: 'text-red-700', barColor: 'bg-red-500' },
  LINKED_DUPLICATE: { label: 'Duplicate', color: 'text-gray-500', barColor: 'bg-gray-300' },
};

export default async function StatsPage() {
  const summary = await fetchPublicStats();

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Public City Statistics</h1>
          <p className="text-gray-500 mt-2">Real-time municipal grievance metrics</p>
        </div>
        <div className="p-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-500 font-medium">Statistics are currently unavailable</p>
          <p className="text-sm text-gray-400 mt-1">The API may be warming up. Please try again in a moment.</p>
        </div>
      </div>
    );
  }

  const total = summary.totalComplaints || 0;
  const resolved = (summary.statusCounts['RESOLVED'] || 0) + (summary.statusCounts['CLOSED'] || 0);
  const inProgress = (summary.statusCounts['IN_PROGRESS'] || 0) + (summary.statusCounts['ASSIGNED'] || 0);
  const pending = total - resolved - inProgress;
  const overdue = summary.overdueComplaints || 0;
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

  const categoryEntries = Object.entries(summary.categoryCounts || {})
    .sort(([, a], [, b]) => b - a);
  const maxCategoryCount = categoryEntries.length > 0 ? categoryEntries[0]![1] : 1;

  const statusEntries = Object.entries(summary.statusCounts)
    .sort(([, a], [, b]) => b - a);

  // Donut chart segments (CSS conic-gradient)
  const donutSegments: string[] = [];
  const donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#06b6d4', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
  let cumulativePct = 0;
  statusEntries.forEach(([, count], i) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const color = donutColors[i % donutColors.length]!;
    donutSegments.push(`${color} ${cumulativePct}% ${cumulativePct + pct}%`);
    cumulativePct += pct;
  });
  const donutGradient = donutSegments.length > 0
    ? `conic-gradient(${donutSegments.join(', ')})`
    : 'conic-gradient(#e5e7eb 0% 100%)';

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="text-center">

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Public City Statistics</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Real-time municipal grievance redressal metrics, updated live from the database.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Submitted', value: total, icon: '📋', bg: 'bg-teal-50 border-teal-200' },
          { label: 'Resolved', value: resolved, icon: '✅', bg: 'bg-green-50 border-green-200' },
          { label: 'In Progress', value: inProgress, icon: '🔧', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Pending', value: pending > 0 ? pending : 0, icon: '⏳', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: '📈', bg: 'bg-teal-50 border-teal-200' },
        ].map((m) => (
          <div key={m.label} className={`${m.bg} border rounded-xl p-5 text-center`}>
            
            <span className="text-2xl">{m.icon}</span>
            <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">{m.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* SLA Alert */}
      {overdue > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold">{overdue} complaint{overdue !== 1 ? 's' : ''} past SLA deadline</p>
            <p className="text-xs text-red-600 mt-0.5">These cases require immediate attention from assigned departments.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Status Distribution - Donut */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Status Distribution</h2>
          <div className="flex justify-center mb-6">
            <div className="relative w-44 h-44">
              <div
                className="w-full h-full rounded-full"
                style={{ background: donutGradient }}
              />
              <div className="absolute inset-[30%] bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-gray-900">{total}</p>
                  <p className="text-[10px] text-gray-500 font-medium">TOTAL</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {statusEntries.map(([status, count], i) => {
              const cfg = STATUS_STYLES[status] ?? { label: status, color: 'text-gray-600', barColor: 'bg-gray-400' };
              const color = donutColors[i % donutColors.length];
              return (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className={`font-medium ${cfg.color} flex-1`}>{cfg.label}</span>
                  <span className="text-gray-500 font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown - Horizontal Bars */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Grievances by Category</h2>
          <p className="text-xs text-gray-400 mb-5">Sorted by volume, highest first</p>
          {categoryEntries.length > 0 ? (
            <div className="space-y-3">
              {categoryEntries.map(([cat, count]) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                const barWidth = maxCategoryCount > 0 ? Math.max(4, (count / maxCategoryCount) * 100) : 4;
                const cfg = CATEGORY_LABELS[cat] ?? { label: cat, icon: '📋', color: 'bg-slate-500' };
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 font-medium text-gray-700">
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                      <span className="text-gray-500 font-mono">{count} <span className="text-gray-300">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full ${cfg.color} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No category data available yet.</p>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      {statusEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Resolution Pipeline</h2>
          <p className="text-xs text-gray-400 mb-5">Current status of all complaints across the pipeline</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {statusEntries.map(([status, count]) => {
              const cfg = STATUS_STYLES[status] ?? { label: status, color: 'text-gray-600', barColor: 'bg-gray-400' };
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <div key={status} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className={`text-xl font-extrabold ${cfg.color}`}>{count}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{cfg.label}</p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className={`h-1 rounded-full ${cfg.barColor} transition-all`}
                      style={{ width: `${Math.max(3, Number(pct))}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-xs text-gray-400">
          Data sourced from the municipal grievance database. Auto-refreshes every 60 seconds.
          All statistics are publicly available under the Right to Information Act.
        </p>
      </div>
    </div>
  );
}
