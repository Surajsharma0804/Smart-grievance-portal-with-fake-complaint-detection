import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Civic Departments & Service Standards | Nagrik Setu',
  description: 'List of municipal departments, categories, and citizen SLA service levels.',
};

export const revalidate = 300; // ISR: 5 minutes

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface Department {
  _id: string;
  code: string;
  name: string;
  defaultSlaHours: number;
  categories?: string[];
}

const DEPT_DESCRIPTIONS: Record<string, string> = {
  SANITATION: 'Garbage disposal, drain desilting, road sweeping, and carcass removal.',
  ROADS: 'Pothole repair, sidewalk restoration, and asphalt surfacing.',
  WATER: 'Pipeline leakage repair, drinking water pressure, and sewage blockages.',
  ELECTRICITY: 'Streetlight outages, exposed cables, and transformer spark hazards.',
  PARKS: 'Park cleaning, dangerous tree trimming, and playground maintenance.',
  TRAFFIC: 'Signal malfunction, traffic sign damage, and illegal roadside parking.',
  HEALTH: 'Public health inspections, disease outbreak response, and sanitary violations.',
  REVENUE: 'Property tax disputes, commercial license issues, and revenue collection.',
};

const DEPT_ICONS: Record<string, string> = {
  SANITATION: '🧹',
  ROADS: '🛣️',
  WATER: '💧',
  ELECTRICITY: '⚡',
  PARKS: '🌳',
  TRAFFIC: '🚦',
  HEALTH: '🏥',
  REVENUE: '💰',
};

async function fetchDepartments(): Promise<Department[]> {
  try {
    // Public departments endpoint — try via the API proxy
    const res = await fetch(`${API_URL}/public/departments`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.departments || [];
  } catch {
    return [];
  }
}

export default async function DepartmentsPage() {
  const departments = await fetchDepartments();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Municipal Departments & SLA</h1>
        <p className="text-gray-600 mt-2">
          Service Level Agreements (SLA) for civic grievance resolution. Severe hazards receive 50% accelerated SLA.
        </p>
      </div>

      {departments.length === 0 ? (
        <div className="p-12 text-center bg-white border rounded-xl">
          <p className="text-gray-500">Department information is loading. Please refresh in a moment.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className="p-5 bg-white border border-gray-200 rounded-xl space-y-2 hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span>{DEPT_ICONS[dept.code] || '🏛️'}</span>
                  {dept.name}
                </h3>
                <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                  {dept.defaultSlaHours}h SLA
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {DEPT_DESCRIPTIONS[dept.code] || `Municipal ${dept.name.toLowerCase()} services and complaint resolution.`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
