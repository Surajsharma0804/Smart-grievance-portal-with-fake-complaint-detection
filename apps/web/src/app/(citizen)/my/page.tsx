import { cookies } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  ANALYZING: { label: 'Analyzing', color: 'bg-yellow-100 text-yellow-800' },
  NEEDS_REVIEW: { label: 'Needs verification', color: 'bg-orange-100 text-orange-800' },
  ROUTED: { label: 'Routed', color: 'bg-purple-100 text-purple-800' },
  ASSIGNED: { label: 'Assigned', color: 'bg-indigo-100 text-indigo-800' },
  IN_PROGRESS: { label: 'In progress', color: 'bg-teal-100 text-teal-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  REOPENED: { label: 'Reopened', color: 'bg-red-100 text-red-800' },
  LINKED_DUPLICATE: { label: 'Linked as duplicate', color: 'bg-gray-100 text-gray-600' },
};

interface Complaint {
  publicId: string;
  title: string;
  status: string;
  createdAt: string;
  category?: string;
  citizenCategory?: string;
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

export default async function MyComplaintsPage() {
  const data = await fetchMyComplaints();

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Could not load your complaints. Please try signing in again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My complaints</h2>
        <Link
          href="/report"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Report new
        </Link>
      </div>

      {data.complaints.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500 mb-4">You have not submitted any complaints yet.</p>
          <Link href="/report" className="text-blue-600 hover:underline">
            Report your first issue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.complaints.map((c) => {
            const status = STATUS_LABELS[c.status] ?? { label: c.status, color: 'bg-gray-100' };
            return (
              <Link
                key={c.publicId}
                href={`/track/${c.publicId}`}
                className="block bg-white border rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{c.title}</h3>
                    <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning>
                      {c.publicId} &middot; {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      {(c.category || c.citizenCategory) && (
                        <> &middot; {c.category || c.citizenCategory}</>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
