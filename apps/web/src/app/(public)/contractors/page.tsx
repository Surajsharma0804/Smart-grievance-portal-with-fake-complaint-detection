import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contractor Portal | Nagrik Setu',
  description: 'View verified contractors and open municipal projects available for bidding.',
};

export const revalidate = 120;

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface Contractor {
  _id: string;
  companyName: string;
  specializations: string[];
  experience: number;
  verified: boolean;
  rating: number;
  totalProjects: number;
  completedProjects: number;
  bio?: string;
  userId?: { name: string; email: string };
}

interface Project {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  estimatedCost?: number;
  address?: string;
  createdAt: string;
  complaintId?: { publicId: string; title: string };
}

async function fetchContractors(): Promise<Contractor[]> {
  try {
    const res = await fetch(`${API_URL}/public/contractors`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.contractors || [];
  } catch {
    return [];
  }
}

async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(`${API_URL}/public/projects`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.projects || [];
  } catch {
    return [];
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  SANITATION: '🧹', ROADS: '🛣️', WATER: '💧', ELECTRICITY: '⚡',
  STREET_LIGHTING: '💡', TRAFFIC: '🚦', PARKS: '🌳', PUBLIC_HEALTH: '🏥',
  STRAY_ANIMALS: '🐕', ENCROACHMENT: '🏗️', OTHER: '📋',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  BIDDING: 'bg-blue-100 text-blue-800',
  AWARDED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default async function ContractorsPage() {
  const [contractors, projects] = await Promise.all([fetchContractors(), fetchProjects()]);

  return (
    <div className="space-y-12 py-4">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Municipal Repair Projects
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl mx-auto">
          Transparent bidding on civic infrastructure projects. View verified contractors,
          browse open projects, and track progress with estimated costs.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/contractors/register"
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            Register as Contractor
          </Link>
          <a
            href="#projects"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Browse Projects ↓
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Verified Contractors', value: contractors.length, icon: '👷', color: 'bg-amber-50 border-amber-200' },
          { label: 'Open Projects', value: projects.filter(p => p.status === 'OPEN' || p.status === 'BIDDING').length, icon: '📋', color: 'bg-blue-50 border-blue-200' },
          { label: 'Total Budget', value: formatCurrency(projects.reduce((s, p) => s + (p.estimatedCost || 0), 0)), icon: '💰', color: 'bg-green-50 border-green-200' },
          { label: 'Completed', value: projects.filter(p => p.status === 'COMPLETED').length, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} border rounded-xl p-4 text-center`}>
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Open Projects */}
      <section id="projects">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Open Projects for Bidding</h2>
            <p className="text-sm text-gray-500 mt-1">Cost estimates based on category and historical data</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
            {projects.filter(p => p.status === 'OPEN' || p.status === 'BIDDING').length} available
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-200 rounded-xl">
            <div className="text-4xl mb-4">🏗️</div>
            <p className="text-gray-500 font-medium">No open projects at the moment</p>
            <p className="text-sm text-gray-400 mt-1">Projects are created when municipal complaints require infrastructure work. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const icon = CATEGORY_ICONS[project.category] || '📋';
              const statusColor = STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800';
              return (
                <div
                  key={project._id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <h3 className="font-bold text-gray-900 text-sm">{project.title}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {project.estimatedCost && (
                        <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          💰 {formatCurrency(project.estimatedCost)}
                        </span>
                      )}
                      {project.address && (
                        <span className="text-gray-500 truncate max-w-[150px]">📍 {project.address}</span>
                      )}
                    </div>
                    {project.complaintId && (
                      <Link
                        href={`/track/${project.complaintId.publicId}`}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        View Issue →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Verified Contractors */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Verified Contractors</h2>
            <p className="text-sm text-gray-500 mt-1">Licensed professionals verified by the municipality</p>
          </div>
        </div>

        {contractors.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-200 rounded-xl">
            <div className="text-4xl mb-4">👷</div>
            <p className="text-gray-500 font-medium">No verified contractors yet</p>
            <p className="text-sm text-gray-400 mt-1">
              <Link href="/contractors/register" className="text-amber-600 hover:underline">Register now</Link> to be among the first.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractors.map((c) => (
              <div key={c._id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
                    {c.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{c.companyName}</h3>
                    {c.userId && <p className="text-xs text-gray-500">{c.userId.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < Math.round(c.rating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{c.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500">{c.completedProjects} completed</span>
                </div>
                {c.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.specializations.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>🏢 {c.experience}y experience</span>
                  {c.verified && (
                    <span className="text-green-600 font-medium flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Are you a licensed contractor?</h2>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          Register on Nagrik Setu to access municipal repair projects, submit competitive bids,
          and build your reputation with transparent milestone tracking.
        </p>
        <Link
          href="/contractors/register"
          className="inline-block px-8 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
        >
          Register as Contractor →
        </Link>
      </section>
    </div>
  );
}
