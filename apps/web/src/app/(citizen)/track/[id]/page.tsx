import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { TrackActions } from './TrackActions';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

interface MediaItem {
  _id: string;
  kind: string;
  key: string;
  publicKey?: string;
  source: string;
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
  media?: MediaItem[];
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

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Cookie = `accessToken=${accessToken}`;
  }

  const res = await fetch(`${API_URL}/complaints/${publicId}`, {
    headers,
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

const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted', icon: '📝' },
  { key: 'ANALYZING', label: 'Analyzing', icon: '🤖' },
  { key: 'ROUTED', label: 'Routed', icon: '🏛️' },
  { key: 'ASSIGNED', label: 'Assigned', icon: '👷' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: '🔧' },
  { key: 'RESOLVED', label: 'Resolved', icon: '✅' },
  { key: 'CLOSED', label: 'Closed', icon: '🏁' },
];

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

const CATEGORY_LABELS: Record<string, string> = {
  SANITATION: 'Garbage & Sanitation',
  ROADS: 'Roads & Footpaths',
  WATER: 'Water Supply',
  ELECTRICITY: 'Electricity',
  STREET_LIGHTING: 'Street Lighting',
  TRAFFIC: 'Traffic Management',
  PARKS: 'Parks & Gardens',
  PUBLIC_HEALTH: 'Public Health',
  STRAY_ANIMALS: 'Stray Animals',
  ENCROACHMENT: 'Encroachment',
  OTHER: 'Other',
};

function getStepStatus(currentStatus: string, stepKey: string): 'done' | 'current' | 'upcoming' {
  const order = LIFECYCLE_STEPS.map((s) => s.key);
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);

  // Handle special statuses
  if (currentStatus === 'REOPENED' || currentStatus === 'NEEDS_REVIEW' || currentStatus === 'LINKED_DUPLICATE') {
    // Show up to where we got
    if (stepIdx < 0) return 'upcoming';
    if (currentStatus === 'REOPENED') {
      return stepIdx <= order.indexOf('IN_PROGRESS') ? 'done' : 'upcoming';
    }
    if (currentStatus === 'NEEDS_REVIEW') {
      return stepIdx <= order.indexOf('ANALYZING') ? 'done' : 'upcoming';
    }
    return stepIdx <= 0 ? 'done' : 'upcoming';
  }

  if (currentIdx < 0 || stepIdx < 0) return 'upcoming';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'upcoming';
}

function SLACountdown({ slaDueAt, status }: { slaDueAt: string; status: string }) {
  const doneStatuses = ['RESOLVED', 'CLOSED', 'LINKED_DUPLICATE'];
  if (doneStatuses.includes(status)) return null;

  const due = new Date(slaDueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
      isOverdue
        ? 'bg-red-50 border border-red-200 text-red-700'
        : hours < 6
        ? 'bg-amber-50 border border-amber-200 text-amber-700'
        : 'bg-blue-50 border border-blue-200 text-blue-700'
    }`}>
      {isOverdue ? (
        <>
          <span>⚠️</span>
          <span>OVERDUE by {hours}h {mins}m</span>
        </>
      ) : (
        <>
          <span>⏱️</span>
          <span>SLA: {hours}h {mins}m remaining</span>
        </>
      )}
    </div>
  );
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const complaint = await fetchComplaint(id);

  if (!complaint) {
    notFound();
  }

  const category = complaint.category || complaint.citizenCategory;
  const categoryLabel = category ? (CATEGORY_LABELS[category] || category) : null;

  // Separate complaint and resolution media
  const complaintPhotos = (complaint.media || []).filter((m) => m.kind === 'complaint');
  const resolutionPhotos = (complaint.media || []).filter((m) => m.kind === 'resolution');

  // Map embed URL
  const [lng, lat] = complaint.location.coordinates;
  const mapBbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{complaint.publicId}</span>
              {categoryLabel && (
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                  {categoryLabel}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{complaint.title}</h1>
            {complaint.description && (
              <p className="text-gray-600 mt-2 text-sm leading-relaxed">{complaint.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[complaint.status] ?? 'bg-gray-400'}`} />
            <span className="font-semibold text-sm">
              {STATUS_LABELS[complaint.status] ?? complaint.status}
            </span>
          </div>
        </div>

        {/* SLA Countdown */}
        {complaint.slaDueAt && (
          <div className="mt-4">
            <SLACountdown slaDueAt={complaint.slaDueAt} status={complaint.status} />
          </div>
        )}

        {/* Analysis badge */}
        {complaint.analysis?.stage && complaint.analysis.stage !== 'DONE' && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Analysis: {complaint.analysis.stage.toLowerCase()}
          </div>
        )}
      </div>

      {/* Progress Stepper */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Complaint Lifecycle</h3>
        <div className="flex items-center min-w-[600px]">
          {LIFECYCLE_STEPS.map((step, i) => {
            const stepStatus = getStepStatus(complaint.status, step.key);
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                      stepStatus === 'done'
                        ? 'bg-green-500 border-green-500 text-white'
                        : stepStatus === 'current'
                        ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                        : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                  >
                    {stepStatus === 'done' ? '✓' : step.icon}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium text-center ${
                    stepStatus === 'done' ? 'text-green-700' :
                    stepStatus === 'current' ? 'text-blue-700' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < LIFECYCLE_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    stepStatus === 'done' ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Special status badges */}
        {(complaint.status === 'REOPENED' || complaint.status === 'NEEDS_REVIEW' || complaint.status === 'LINKED_DUPLICATE') && (
          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            complaint.status === 'REOPENED' ? 'bg-red-50 text-red-700 border border-red-200' :
            complaint.status === 'NEEDS_REVIEW' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
            'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {complaint.status === 'REOPENED' && '🔄 Complaint has been reopened by the citizen'}
            {complaint.status === 'NEEDS_REVIEW' && '🔍 Flagged for manual verification by reviewer'}
            {complaint.status === 'LINKED_DUPLICATE' && '🔗 Linked as a duplicate of another complaint'}
          </div>
        )}
      </div>

      {/* Citizen interactive actions */}
      <TrackActions
        publicId={complaint.publicId}
        initialUpvotes={complaint.upvotes ?? 0}
        status={complaint.status}
        isOwner={complaint.anonymous !== undefined}
      />

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Details card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            {categoryLabel && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{categoryLabel}</dd>
              </div>
            )}
            {complaint.address && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900 text-right max-w-[60%]">{complaint.address}</dd>
              </div>
            )}
            {complaint.landmark && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Landmark</dt>
                <dd className="font-medium text-gray-900">{complaint.landmark}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Submitted</dt>
              <dd className="font-medium text-gray-900" suppressHydrationWarning>
                {new Date(complaint.createdAt).toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last updated</dt>
              <dd className="font-medium text-gray-900" suppressHydrationWarning>
                {new Date(complaint.updatedAt).toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Upvotes</dt>
              <dd className="font-medium text-gray-900">{complaint.upvotes}</dd>
            </div>
            {complaint.slaDueAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">SLA due</dt>
                <dd className="font-medium text-gray-900" suppressHydrationWarning>
                  {new Date(complaint.slaDueAt).toLocaleString('en-IN')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Location Map */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</h3>
            <p className="text-xs text-gray-400">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
          <iframe
            title="Complaint location"
            width="100%"
            height="220"
            className="border-0"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&layer=mapnik&marker=${lat},${lng}`}
          />
        </div>
      </div>

      {/* Photos Section */}
      {(complaintPhotos.length > 0 || resolutionPhotos.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Photo Evidence</h3>

          {complaintPhotos.length > 0 && resolutionPhotos.length > 0 ? (
            /* Before/After comparison layout */
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Before (Complaint)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {complaintPhotos.map((m) => (
                    <div key={m._id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${m.publicKey || m.key}`}
                        alt="Complaint photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  After (Resolution)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {resolutionPhotos.map((m) => (
                    <div key={m._id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${m.publicKey || m.key}`}
                        alt="Resolution photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Single type photos */
            <div>
              {complaintPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">📸 Complaint Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {complaintPhotos.map((m) => (
                      <div key={m._id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${m.publicKey || m.key}`}
                          alt="Complaint photo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resolutionPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-2">✅ Resolution Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {resolutionPhotos.map((m) => (
                      <div key={m._id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${m.publicKey || m.key}`}
                          alt="Resolution photo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Status Timeline</h3>
        {complaint.statusHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No timeline entries yet.</p>
        ) : (
          <ol className="relative border-l-2 border-gray-200 ml-3 space-y-6">
            {complaint.statusHistory.map((entry, i) => {
              const isLast = i === complaint.statusHistory.length - 1;
              const dotColor = STATUS_COLORS[entry.to] ?? 'bg-gray-400';
              return (
                <li key={i} className="ml-6 relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ${dotColor} ${isLast ? 'ring-4 ring-gray-100' : ''}`} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {STATUS_LABELS[entry.to] ?? entry.to}
                    </span>
                    {entry.from && (
                      <span className="text-[10px] text-gray-400">
                        from {STATUS_LABELS[entry.from] ?? entry.from}
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-sm text-gray-600 mt-0.5">{entry.note}</p>
                  )}
                  <time className="text-xs text-gray-400 mt-0.5 block" suppressHydrationWarning>
                    {new Date(entry.at).toLocaleString('en-IN')}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
