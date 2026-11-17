'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalComplaints: number;
  statusCounts: Record<string, number>;
  overdueComplaints: number;
}

function AnimatedCounter({ target, duration = 2000, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString('en-IN')}{suffix}</span>;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.summary) setStats(d.summary); })
      .catch(() => {});
  }, []);

  const total = stats?.totalComplaints ?? 0;
  const resolved = (stats?.statusCounts?.['RESOLVED'] ?? 0) + (stats?.statusCounts?.['CLOSED'] ?? 0);
  const inProgress = (stats?.statusCounts?.['IN_PROGRESS'] ?? 0) + (stats?.statusCounts?.['ASSIGNED'] ?? 0);
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[40px] -mr-4 -mt-4 group-hover:bg-blue-100 transition-colors" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reported</p>
        <p className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 tabular-nums">
          <AnimatedCounter target={total} />
        </p>
        <p className="text-xs text-gray-400 mt-1">Civic issues logged</p>
      </div>

      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[40px] -mr-4 -mt-4 group-hover:bg-emerald-100 transition-colors" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved</p>
        <p className="text-3xl md:text-4xl font-extrabold text-emerald-600 mt-2 tabular-nums">
          <AnimatedCounter target={resolved} />
        </p>
        <p className="text-xs text-gray-400 mt-1">Successfully fixed</p>
      </div>

      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-[40px] -mr-4 -mt-4 group-hover:bg-amber-100 transition-colors" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</p>
        <p className="text-3xl md:text-4xl font-extrabold text-amber-600 mt-2 tabular-nums">
          <AnimatedCounter target={inProgress} />
        </p>
        <p className="text-xs text-gray-400 mt-1">Being worked on</p>
      </div>

      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[40px] -mr-4 -mt-4 group-hover:bg-blue-100 transition-colors" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolution Rate</p>
        <p className="text-3xl md:text-4xl font-extrabold text-blue-600 mt-2 tabular-nums">
          <AnimatedCounter target={rate} suffix="%" />
        </p>
        <p className="text-xs text-gray-400 mt-1">Complaints resolved</p>
      </div>
    </div>
  );
}
