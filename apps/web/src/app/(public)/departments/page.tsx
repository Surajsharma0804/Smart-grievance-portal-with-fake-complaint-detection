import type { Metadata } from 'next';
import { DepartmentsList } from './DepartmentsList';

export const metadata: Metadata = {
  title: 'Municipal Departments | Nagrik Setu',
  description: 'View all municipal departments, their SLA standards, and complaint categories they handle.',
};

export const revalidate = 300;

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface Department {
  _id: string;
  code: string;
  name: string;
  categories: string[];
  defaultSlaHours: number;
}

async function fetchDepartments(): Promise<Department[]> {
  try {
    const res = await fetch(`${API_URL}/public/departments`, {
      cache: 'no-store',
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
    <div className="space-y-8 py-4">
      {/* Hero */}
      <section className="text-center relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-purple-50 to-transparent rounded-full blur-3xl" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full mb-4">
          🏛️ Municipal Services
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Municipal{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Departments
          </span>
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl mx-auto">
          Each complaint is routed to the appropriate department based on category.
          View SLA standards and areas of responsibility.
        </p>
      </section>

      {departments.length === 0 ? (
        <div className="p-16 text-center bg-white border border-gray-200 rounded-2xl">
          <div className="text-4xl mb-4">🏛️</div>
          <p className="text-gray-500">Department information is currently unavailable. The API may be warming up — try again shortly.</p>
        </div>
      ) : (
        <DepartmentsList departments={departments} />
      )}
    </div>
  );
}
