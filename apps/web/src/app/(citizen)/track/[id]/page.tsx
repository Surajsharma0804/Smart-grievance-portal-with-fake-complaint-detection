import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { TrackActions } from './TrackActions';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

interface ComplaintDetail {
  publicId: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  citizenCategory?: string;
  location: { type: string; coordinates: [number, number] };
  address?: string;
  landmark?: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  statusHistory: Array<{
    from: string;
    to: string;
    at: string;
    note?: string;
  }>;
  // Owner-only fields
  anonymous?: boolean;
  wardId?: string;
  departmentId?: string;
  slaDueAt?: string;
  analysis?: { stage?: string };
}

async function fetchComplaint(publicId: string): Promise<ComplaintDetail | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return null;

  const res = await fetch(`${API_URL}/complaints/${publicId}`, {
    headers: { Cookie: `accessToken=${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const body = await res.json();
  return body.complaint;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const complaint = await fetchComplaint(id);

  if (!complaint) {
    return { title: 'Complaint not found - Nagrik Setu' };
  }

  return {
    title: `${complaint.publicId}: ${complaint.title} - Nagrik Setu`,
    description: complaint.description || `Track complaint ${complaint.publicId}`,
  };
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ANALYZING: 'Analyzing',
  NEEDS_REVIEW: 'Needs verification',
  ROUTED: 'Routed to department',
  ASSIGNED: 'Assigned to officer',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  LINKED_DUPLICATE: 'Linked as duplicate',
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-blue-500',
  ANALYZING: 'bg-yellow-500',
  NEEDS_REVIEW: 'bg-orange-500',
  ROUTED: 'bg-purple-500',
  ASSIGNED: 'bg-indigo-500',
  IN_PROGRESS: 'bg-teal-500',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-400',
  REOPENED: 'bg-red-500',
  LINKED_DUPLICATE: 'bg-gray-400',
};

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const complaint = await fetchComplaint(id);

  if (!complaint) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">{complaint.publicId}</p>
        <h2 className="text-2xl font-bold">{complaint.title}</h2>
        {complaint.description && (
          <p className="text-gray-600 mt-2">{complaint.description}</p>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[complaint.status] ?? 'bg-gray-400'}`} />
        <span className="font-medium">
          {STATUS_LABELS[complaint.status] ?? complaint.status}
        </span>
        {complaint.analysis?.stage && complaint.analysis.stage !== 'DONE' && (
          <span className="text-xs text-gray-500">
            (Analysis: {complaint.analysis.stage.toLowerCase()})
          </span>
        )}
      </div>

      {/* Citizen interactive actions: Upvote, Feedback, Reopen, Appeal */}
      <TrackActions
        publicId={complaint.publicId}
        initialUpvotes={complaint.upvotes ?? 0}
        status={complaint.status}
        isOwner={complaint.anonymous !== undefined}
      />

      {/* Details card */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Details</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {(complaint.category || complaint.citizenCategory) && (
            <>
              <dt className="text-gray-500">Category</dt>
              <dd>{complaint.category || complaint.citizenCategory}</dd>
            </>
          )}
          {complaint.address && (
            <>
              <dt className="text-gray-500">Address</dt>
              <dd>{complaint.address}</dd>
            </>
          )}
          {complaint.landmark && (
            <>
              <dt className="text-gray-500">Landmark</dt>
              <dd>{complaint.landmark}</dd>
            </>
          )}
          <dt className="text-gray-500">Submitted</dt>
          <dd suppressHydrationWarning>{new Date(complaint.createdAt).toLocaleString('en-IN')}</dd>
          <dt className="text-gray-500">Last updated</dt>
          <dd suppressHydrationWarning>{new Date(complaint.updatedAt).toLocaleString('en-IN')}</dd>
          <dt className="text-gray-500">Upvotes</dt>
          <dd>{complaint.upvotes}</dd>
          {complaint.slaDueAt && (
            <>
              <dt className="text-gray-500">SLA due</dt>
              <dd suppressHydrationWarning>{new Date(complaint.slaDueAt).toLocaleString('en-IN')}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Timeline */}
      <div className="bg-white border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Timeline</h3>
        {complaint.statusHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No timeline entries yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {complaint.statusHistory.map((entry, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                <p className="text-sm font-medium">
                  {STATUS_LABELS[entry.to] ?? entry.to}
                </p>
                {entry.note && (
                  <p className="text-sm text-gray-600">{entry.note}</p>
                )}
                <time className="text-xs text-gray-400" suppressHydrationWarning>
                  {new Date(entry.at).toLocaleString('en-IN')}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
