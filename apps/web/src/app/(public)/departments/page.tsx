import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Civic Departments & Service Standards | Nagrik Setu',
  description: 'List of municipal departments, categories, and citizen SLA service levels.',
};

export const revalidate = 300; // ISR: 5 minutes

export default function DepartmentsPage() {
  const departments = [
    {
      code: 'SANITATION',
      name: 'Public Health & Sanitation',
      slaHours: 24,
      description: 'Garbage disposal, drain desilting, road sweeping, and carcass removal.',
    },
    {
      code: 'ROADS',
      name: 'Engineering & Roads Division',
      slaHours: 48,
      description: 'Pothole repair, sidewalk restoration, and asphalt surfacing.',
    },
    {
      code: 'WATER',
      name: 'Water Supply & Sewerage',
      slaHours: 24,
      description: 'Pipeline leakage repair, drinking water pressure, and sewage blockages.',
    },
    {
      code: 'ELECTRICITY',
      name: 'Electricity & Lighting',
      slaHours: 12,
      description: 'Streetlight outages, exposed cables, and transformer spark hazards.',
    },
    {
      code: 'PARKS',
      name: 'Horticulture & Parks',
      slaHours: 72,
      description: 'Park cleaning, dangerous tree trimming, and playground maintenance.',
    },
    {
      code: 'TRAFFIC',
      name: 'Traffic Management & Enforcement',
      slaHours: 24,
      description: 'Signal malfunction, traffic sign damage, and illegal roadside parking.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Municipal Departments & SLA</h1>
        <p className="text-gray-600 mt-2">
          Service Level Agreements (SLA) for civic grievance resolution. Severe hazards receive 50% accelerated SLA.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.code}
            className="p-5 bg-white border border-gray-200 rounded-xl space-y-2 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-900">{dept.name}</h3>
              <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                {dept.slaHours}h SLA
              </span>
            </div>
            <p className="text-sm text-gray-600">{dept.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
