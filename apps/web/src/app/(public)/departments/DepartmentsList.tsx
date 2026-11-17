'use client';

import { useState } from 'react';

interface Department {
  _id: string;
  code: string;
  name: string;
  categories: string[];
  defaultSlaHours: number;
}

const DEPT_ICONS: Record<string, string> = {
  RD: '🛣️',
  SN: '🧹',
  WS: '💧',
  EL: '⚡',
  SL: '💡',
  TM: '🚦',
  PG: '🌳',
  PH: '🏥',
  SA: '🐕',
  EN: '🏗️',
};

const DEPT_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  RD: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'from-amber-500 to-orange-500' },
  SN: { bg: 'bg-green-50', border: 'border-green-200', accent: 'from-green-500 to-emerald-500' },
  WS: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'from-blue-500 to-cyan-500' },
  EL: { bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'from-yellow-500 to-amber-500' },
  SL: { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'from-orange-400 to-yellow-500' },
  TM: { bg: 'bg-red-50', border: 'border-red-200', accent: 'from-red-500 to-rose-500' },
  PG: { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'from-emerald-500 to-teal-500' },
  PH: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'from-purple-500 to-violet-500' },
  SA: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'from-amber-600 to-yellow-600' },
  EN: { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'from-gray-500 to-slate-500' },
};

const CATEGORY_LABELS: Record<string, string> = {
  SANITATION: 'Sanitation',
  ROADS: 'Roads',
  WATER: 'Water Supply',
  ELECTRICITY: 'Electricity',
  STREET_LIGHTING: 'Street Lighting',
  TRAFFIC: 'Traffic',
  PARKS: 'Parks',
  PUBLIC_HEALTH: 'Public Health',
  STRAY_ANIMALS: 'Stray Animals',
  ENCROACHMENT: 'Encroachment',
  OTHER: 'Other',
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'from-gray-500 to-slate-500' };

export function DepartmentsList({ departments }: { departments: Department[] }) {
  const [search, setSearch] = useState('');

  const filtered = departments.filter((d) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.categories.some((c) => c.toLowerCase().includes(q) || (CATEGORY_LABELS[c] || '').toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search departments or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-shadow"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
          <p className="text-gray-500 text-sm">No departments match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dept) => {
            const deptCode = dept.code.substring(0, 2).toUpperCase();
            const icon = DEPT_ICONS[deptCode] || '🏛️';
            const colors = DEPT_COLORS[deptCode] || DEFAULT_COLOR;
            const slaLabel = dept.defaultSlaHours >= 24
              ? `${Math.round(dept.defaultSlaHours / 24)}d SLA`
              : `${dept.defaultSlaHours}h SLA`;

            return (
              <div
                key={dept._id}
                className={`${colors.bg} border ${colors.border} rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.accent}`} />

                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                    {icon}
                  </div>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full text-gray-500 border border-gray-200">
                    {slaLabel}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{dept.name}</h3>
                <p className="text-xs text-gray-500 mb-3 font-mono">{dept.code}</p>

                {dept.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dept.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] bg-white/80 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-medium"
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="text-center text-xs text-gray-400 mt-4">
        {departments.length} department{departments.length !== 1 ? 's' : ''} serving your municipality
      </div>
    </div>
  );
}
