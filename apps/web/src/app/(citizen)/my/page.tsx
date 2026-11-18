import { cookies } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '📝' },
  ANALYZING: { label: 'AI Analyzing', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: '🤖' },
  NEEDS_REVIEW: { label: 'Under Review', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '🔍' },
  ROUTED: { label: 'Routed to Dept', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '🏛️' },
  ASSIGNED: { label: 'Officer Assigned', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: '👷' },
  IN_PROGRESS: { label: 'Work in Progress', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: '🔧' },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '✅' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: '📁' },
  REOPENED: { label: 'Reopened', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: '🔄' },
  LINKED_DUPLICATE: { label: 'Duplicate', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: '🔗' },
};

const CATEGORY_ICONS: Record<string, string> = {
  SANITATION: '🧹', ROADS: '🛣️', WATER: '💧', ELECTRICITY: '⚡',
  STREET_LIGHTING: '💡', TRAFFIC: '🚦', PARKS: '🌳', PUBLIC_HEALTH: '🏥',
  STRAY_ANIMALS: '🐕', ENCROACHMENT: '🏗️', OTHER: '📋',
};

interface Complaint {
  publicId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  category?: string;
  citizenCategory?: string;
  address?: string;
  mediaKeys?: string[];
}

async function fetchMyComplaints(): Promise<{ complaints: Complaint[]; total: number } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return null;

  const res = await fetch(`${API_URL}/complaints/mine?limit=50`, {
    headers: { Cookie: `accessToken=${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const body = await res.json();
  return { complaints: body.complaints, total: body.pagination.total };
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getProgressPercent(status: string): number {
  const stages: Record<string, number> = {
    SUBMITTED: 10, ANALYZING: 20, NEEDS_REVIEW: 30, ROUTED: 45,
    ASSIGNED: 55, IN_PROGRESS: 70, RESOLVED: 95, CLOSED: 100,
    REOPENED: 40, LINKED_DUPLICATE: 100,
  };
  return stages[status] ?? 10;
}

export default async function MyComplaintsPage() {
  const data = await fetchMyComplaints();

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center bg-white border border-gray-200 rounded-xl p-12">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in Required</h2>
          <p className="text-gray-500 mb-6">Please sign in to view and manage your complaints.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  const activeCount = data.complaints.filter(c => !['RESOLVED', 'CLOSED', 'LINKED_DUPLICATE'].includes(c.status)).length;
  const resolvedCount = data.complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Complaints</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.total} total &middot; {activeCount} active &middot; {resolvedCount} resolved
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>📝</span> Report New Issue
        </Link>
      </div>

      {/* Quick Stats */}
      {data.complaints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{data.total}</p>
            <p className="text-xs text-blue-600 font-medium">Total Filed</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{activeCount}</p>
            <p className="text-xs text-amber-600 font-medium">Active</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
            <p className="text-xs text-green-600 font-medium">Resolved</p>
          </div>
        </div>
      )}

      {/* Complaints List */}
      {data.complaints.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No complaints yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            You haven&apos;t submitted any civic complaints. Report an issue in your area to get started.
          </p>
          <Link
            href="/report"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            📸 Report Your First Issue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.complaints.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: '📋' };
            const catIcon = CATEGORY_ICONS[c.category || c.citizenCategory || ''] || '📋';
            const progress = getProgressPercent(c.status);
            const isActive = !['RESOLVED', 'CLOSED', 'LINKED_DUPLICATE'].includes(c.status);

            return (
              <Link
                key={c.publicId}
                href={`/track/${c.publicId}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors group"
              >
                {/* Top color bar */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  isActive ? 'bg-blue-500' : 'bg-green-500'
                }`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{catIcon}</span>
                      <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                        {c.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{c.publicId}</span>
                      <span>&middot;</span>
                      <span suppressHydrationWarning>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {c.updatedAt && (
                        <>
                          <span>&middot;</span>
                          <span className="text-blue-600" suppressHydrationWarning>Updated {getTimeAgo(c.updatedAt)}</span>
                        </>
                      )}
                    </div>

                    {c.address && (
                      <p className="text-xs text-gray-400 mt-1 truncate">📍 {c.address}</p>
                    )}

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isActive ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{progress}%</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${cfg.bg} ${cfg.color} shrink-0`}>
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </div>
                </div>

                {/* Hover hint */}
                <div className="absolute bottom-2 right-3 text-[10px] text-gray-300 group-hover:text-blue-500 transition-colors font-medium">
                  View details →
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Help section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">📞</span>
            <div>
              <p className="font-medium text-gray-900">Helpline</p>
              <p className="text-gray-500 text-xs">Call 1800-XXX-XXXX for assistance</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">⏱️</span>
            <div>
              <p className="font-medium text-gray-900">SLA Guarantee</p>
              <p className="text-gray-500 text-xs">Most issues resolved within 72 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🔄</span>
            <div>
              <p className="font-medium text-gray-900">Not Satisfied?</p>
              <p className="text-gray-500 text-xs">Reopen within 7 days of resolution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
