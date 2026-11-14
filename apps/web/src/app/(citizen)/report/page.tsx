'use client';

import { useActionState, useState, useEffect } from 'react';
import {
  submitComplaintAction,
  getPresignedUploadUrlsAction,
  type ReportState,
} from '@/lib/complaint-actions';

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

interface UploadItem {
  id: string;
  name: string;
  previewUrl: string;
  key?: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const initial: ReportState = {};

export default function ReportPage() {
  const [state, action, pending] = useActionState(submitComplaintAction, initial);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploads.length + files.length > 4) {
      setUploadError('Maximum 4 photos allowed per complaint.');
      return;
    }

    const newItems: UploadItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      previewUrl: URL.createObjectURL(f),
      status: 'uploading',
    }));

    setUploads((prev) => [...prev, ...newItems]);

    // Request presigned URLs
    const presignReq = files.map((f) => ({
      contentType: f.type || 'image/jpeg',
      fileSize: f.size,
    }));

    const res = await getPresignedUploadUrlsAction(presignReq);
    if (res.error || !res.uploads) {
      setUploadError(res.error || 'Failed to initialize uploads');
      setUploads((prev) =>
        prev.map((item) =>
          newItems.some((n) => n.id === item.id)
            ? { ...item, status: 'error', error: res.error || 'Upload error' }
            : item,
        ),
      );
      return;
    }

    // Upload each file directly to the presigned URL
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const item = newItems[i]!;
      const presigned = res.uploads[i]!;

      try {
        const uploadRes = await fetch(presigned.url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed (${uploadRes.status})`);
        }

        setUploads((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, key: presigned.key, status: 'done' }
              : it,
          ),
        );
      } catch (err: unknown) {
        setUploads((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload error',
                }
              : it,
          ),
        );
      }
    }
  }

  function handleRemoveUpload(id: string) {
    setUploads((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  }

  const completedKeys = uploads.filter((u) => u.status === 'done' && u.key).map((u) => u.key!);
  const isUploading = uploads.some((u) => u.status === 'uploading');

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Report a civic issue</h2>
      <p className="text-gray-600 mb-6">
        Describe the problem, attach evidence photos, and provide your location. We will route it to the right department.
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
        <input type="hidden" name="mediaKeys" value={completedKeys.join(',')} />

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
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="citizenCategory" className="block text-sm font-medium mb-1">
            Category (optional)
          </label>
          <select
            id="citizenCategory"
            name="citizenCategory"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Media Photo Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Evidence Photos (1 to 4 images)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Accepted formats: JPEG, PNG, WebP (max 10MB each).
          </p>

          {uploads.length < 4 && (
            <div className="mb-3">
              <label className="inline-block cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                Choose photos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {uploadError && (
            <p className="text-sm text-red-600 mb-2">{uploadError}</p>
          )}

          {uploads.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {uploads.map((item) => (
                <div key={item.id} className="relative border rounded-lg overflow-hidden bg-gray-50 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-full h-24 object-cover rounded"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs px-1">
                    {item.status === 'uploading' && (
                      <span className="text-blue-600 font-medium">Uploading...</span>
                    )}
                    {item.status === 'done' && (
                      <span className="text-green-600 font-medium">Ready</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-red-600 font-medium" title={item.error}>Failed</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveUpload(item.id)}
                      className="text-gray-400 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {state.fieldErrors?.mediaKeys && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.mediaKeys}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1">Grievance Location <span className="text-red-500">*</span></label>
          {location ? (
            <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
              <span>📍 Pinned: Lat {location.lat.toFixed(5)}, Lng {location.lng.toFixed(5)}</span>
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="text-xs text-gray-500 hover:text-red-600 underline font-medium"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={requestLocation}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium text-gray-700"
              >
                📡 Use current GPS location
              </button>
              <button
                type="button"
                onClick={() => setLocation({ lat: 30.7333, lng: 76.7794 })}
                className="px-3 py-2 text-xs border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                📍 Quick pin: Sector 17 (Chandigarh)
              </button>
            </div>
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
          disabled={pending || isUploading || !location}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Submitting...' : isUploading ? 'Uploading photos...' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}
