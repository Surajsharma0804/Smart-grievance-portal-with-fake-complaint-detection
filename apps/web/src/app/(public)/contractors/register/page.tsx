'use client';

import { useState } from 'react';
import Link from 'next/link';

const SPECIALIZATION_OPTIONS = [
  'Roads & Paving', 'Drainage & Sewage', 'Water Supply', 'Electrical Work',
  'Street Lighting', 'Park Landscaping', 'Building Repair', 'Traffic Infrastructure',
  'Sanitation', 'Demolition & Clearing',
];

export default function ContractorRegisterPage() {
  const [form, setForm] = useState({
    companyName: '',
    licenseNumber: '',
    experience: '',
    bio: '',
    phone: '',
    address: '',
    specializations: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function toggleSpec(spec: string) {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/contractors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          licenseNumber: form.licenseNumber,
          specializations: form.specializations,
          experience: parseInt(form.experience) || 0,
          bio: form.bio || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: 'Registration successful! Your profile is pending verification by municipal staff.' });
      } else {
        setResult({ ok: false, message: data.error?.message || 'Registration failed. Please try again.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please check your connection and try again.' });
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/contractors" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
          ← Back to Contractor Portal
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contractor Registration</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Register as a verified municipal contractor to bid on civic infrastructure projects.
          Your profile will be reviewed by department administrators.
        </p>
      </div>

      {result?.ok ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-bold text-green-900 mb-2">Registration Submitted!</h2>
          <p className="text-sm text-green-700 mb-4">{result.message}</p>
          <Link
            href="/contractors"
            className="inline-block px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700"
          >
            View Contractor Portal
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Firm Name *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              placeholder="e.g., Sharma Construction Pvt. Ltd."
            />
          </div>

          {/* License */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License / Registration Number *</label>
            <input
              type="text"
              required
              value={form.licenseNumber}
              onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              placeholder="e.g., MCD/CONT/2024/1234"
            />
          </div>

          {/* Experience & Phone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={99}
                value={form.experience}
                onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              placeholder="123, Industrial Area, Phase 2"
            />
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => {
                const selected = form.specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpec(spec)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      selected
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {selected ? '✓ ' : ''}{spec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">About Your Company</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              maxLength={1000}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none resize-none"
              placeholder="Brief description of your company, notable projects, certifications..."
            />
          </div>

          {/* Error */}
          {result && !result.ok && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              ⚠️ {result.message}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              You must be signed in to register. Profile will be verified by staff.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Registering...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
