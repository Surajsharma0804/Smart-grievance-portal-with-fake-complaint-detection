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
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Municipal Departments
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl mx-auto">
          Each complaint is routed to the appropriate department based on category.
          View SLA standards and areas of responsibility.
        </p>
      </section>

      {departments.length === 0 ? (
        <div className="p-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="text-4xl mb-4">🏛️</div>
          <p className="text-gray-500">Department information is currently unavailable. The API may be warming up — try again shortly.</p>
        </div>
      ) : (
        <DepartmentsList departments={departments} />
      )}
    </div>
  );
}
