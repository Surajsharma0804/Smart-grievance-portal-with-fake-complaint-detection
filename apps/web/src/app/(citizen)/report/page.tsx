'use client';

import { useActionState, useState } from 'react';
import { submitComplaintAction, type ReportState } from '@/lib/complaint-actions';

const CATEGORIES = [
  { value: 'SANITATION', label: 'Sanitation' },
  { value: 'ROADS', label: 'Roads' },
  { value: 'WATER', label: 'Water Supply' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'STREET_LIGHTING', label: 'Street Lighting' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'PARKS', label: 'Parks and Gardens' },
  { value: 'PUBLIC_HEALTH', label: 'Public Health' },
  { value: 'STRAY_ANIMALS', label: 'Stray Animals' },
  { value: 'ENCROACHMENT', label: 'Encroachment' },
  { value: 'OTHER', label: 'Other' },
];

const initial: ReportState = {};

export default function ReportPage() {
  const [state, action, pending] = useActionState(submitComplaintAction, initial);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function requestLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow location access or enter coordinates manually.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Try again or enter coordinates manually.');
            break;
          default:
            setGeoError('Could not determine location. Try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Report a civic issue</h2>
      <p className="text-gray-600 mb-6">
        Describe the problem and add your location. We will route it to the right department.
      </p>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5 bg-white border rounded-lg p-6">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="lng" value={location?.lng ?? ''} />
        <input type="hidden" name="lat" value={location?.lat ?? ''} />

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={5}
            maxLength={200}
            placeholder="Broken streetlight near sector 17 market"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.title && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            placeholder="Add details about the problem..."
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="citizenCategory" className="block text-sm font-medium mb-1">
            Category (optional)
          </label>
          <select
            id="citizenCategory"
            name="citizenCategory"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          {location ? (
            <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </p>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Use my current location
            </button>
          )}
          {geoError && (
            <p className="text-sm text-red-600 mt-1">{geoError}</p>
          )}
          {!location && state.fieldErrors?.['location.coordinates'] && (
            <p className="text-sm text-red-600 mt-1">Please set your location before submitting.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input id="anonymous" name="anonymous" type="checkbox" className="rounded" />
          <label htmlFor="anonymous" className="text-sm">
            Submit anonymously (your identity will be hidden from public view)
          </label>
        </div>

        <button
          type="submit"
          disabled={pending || !location}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Submitting...' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}
