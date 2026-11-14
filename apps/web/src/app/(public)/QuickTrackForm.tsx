'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function QuickTrackForm() {
  const [complaintId, setComplaintId] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = complaintId.trim().toUpperCase();
    if (trimmed) {
      router.push(`/track/${trimmed}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md mx-auto mt-6 gap-2">
      <input
        type="text"
        placeholder="Enter Grievance ID (e.g. NS-DEMO-001)"
        value={complaintId}
        onChange={(e) => setComplaintId(e.target.value)}
        className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
      >
        Track
      </button>
    </form>
  );
}
