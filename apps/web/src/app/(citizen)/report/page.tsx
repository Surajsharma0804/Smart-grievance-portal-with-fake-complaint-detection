'use client';

import { useActionState, useState, useEffect, useCallback } from 'react';
import {
  submitComplaintAction,
  getPresignedUploadUrlsAction,
  type ReportState,
} from '@/lib/complaint-actions';

const CATEGORIES = [
  { value: 'SANITATION', label: 'Sanitation', icon: '🧹' },
  { value: 'ROADS', label: 'Roads & Potholes', icon: '🛣️' },
  { value: 'WATER', label: 'Water Supply', icon: '💧' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
  { value: 'STREET_LIGHTING', label: 'Street Lighting', icon: '💡' },
  { value: 'TRAFFIC', label: 'Traffic', icon: '🚦' },
  { value: 'PARKS', label: 'Parks and Gardens', icon: '🌳' },
  { value: 'PUBLIC_HEALTH', label: 'Public Health', icon: '🏥' },
  { value: 'STRAY_ANIMALS', label: 'Stray Animals', icon: '🐕' },
  { value: 'ENCROACHMENT', label: 'Encroachment', icon: '🏗️' },
  { value: 'OTHER', label: 'Other', icon: '📋' },
];

interface UploadItem {
  id: string;
  name: string;
  previewUrl: string;
  key?: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface LocationInfo {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  displayName?: string;
}

const initial: ReportState = {};

export default function ReportPage() {
  const [state, action, pending] = useActionState(submitComplaintAction, initial);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // Reverse geocode coordinates to get address details using OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<LocationInfo>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'NagrikSetu/1.0 (civic-grievance-portal)' } }
      );
      if (!res.ok) return {};
      const data = await res.json();
      const addr = data.address || {};
      return {
        address: [
          addr.house_number,
          addr.road || addr.pedestrian,
          addr.neighbourhood || addr.suburb,
        ].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(','),
        area: addr.suburb || addr.neighbourhood || addr.village || addr.town || '',
        city: addr.city || addr.town || addr.county || '',
        state: addr.state || '',
        pincode: addr.postcode || '',
        displayName: data.display_name || '',
      };
    } catch {
      return {};
    }
  }, []);

  // Request real GPS location from browser
  const requestLocation = useCallback(() => {
    setGeoError(null);
    setGeoLoading(true);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please enter coordinates manually.');
      setGeoLoading(false);
      setShowManual(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        // Reverse geocode to get address
        const geo = await reverseGeocode(lat, lng);

        setLocation({
          lat,
          lng,
          accuracy: Math.round(accuracy),
          ...geo,
        });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('📍 Location permission denied. Please allow location access in your browser settings, or enter coordinates manually below.');
            setShowManual(true);
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('📍 Location unavailable. Your device could not determine your position. Try again or enter coordinates manually.');
            setShowManual(true);
            break;
          case err.TIMEOUT:
            setGeoError('📍 Location request timed out. Check your GPS or network connection.');
            setShowManual(true);
            break;
          default:
            setGeoError('📍 Could not determine location. Please try again or enter manually.');
            setShowManual(true);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [reverseGeocode]);

  // Manual coordinate entry
  const handleManualLocation = useCallback(async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGeoError('Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.');
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    const geo = await reverseGeocode(lat, lng);
    setLocation({ lat, lng, ...geo });
    setGeoLoading(false);
  }, [manualLat, manualLng, reverseGeocode]);

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

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const item = newItems[i]!;
      const presigned = res.uploads[i]!;

      try {
        const uploadRes = await fetch(presigned.url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/jpeg' },
          body: file,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);
        setUploads((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, key: presigned.key, status: 'done' } : it,
          ),
        );
      } catch (err: unknown) {
        setUploads((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Upload error' }
              : it,
          ),
        );
      }
    }
  }

  function handleRemoveUpload(id: string) {
    setUploads((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }

  const completedKeys = uploads.filter((u) => u.status === 'done' && u.key).map((u) => u.key!);
  const isUploading = uploads.some((u) => u.status === 'uploading');

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Report a Civic Issue</h2>
      <p className="text-gray-600 mb-6">
        Describe the problem, attach evidence photos, and pin your exact GPS location. We&apos;ll route it to the right department.
      </p>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5 bg-white border rounded-xl p-6 shadow-sm">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="lng" value={location?.lng ?? ''} />
        <input type="hidden" name="lat" value={location?.lat ?? ''} />
        <input type="hidden" name="mediaKeys" value={completedKeys.join(',')} />

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={5}
            maxLength={200}
            placeholder="e.g., Broken streetlight near sector 17 market"
            className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {state.fieldErrors?.title && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            placeholder="Provide additional details about the problem — how long it's been there, impact on residents, etc."
            className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="citizenCategory" className="block text-sm font-medium mb-1">
            Category
          </label>
          <select
            id="citizenCategory"
            name="citizenCategory"
            className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Evidence Photos (up to 4)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Accepted: JPEG, PNG, WebP (max 10MB each). Photos help verify the issue.
          </p>

          {uploads.length < 4 && (
            <div className="mb-3">
              <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                📷 Choose photos
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}

          {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}

          {uploads.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {uploads.map((item) => (
                <div key={item.id} className="relative border rounded-lg overflow-hidden bg-gray-50 p-1">
                  <img src={item.previewUrl} alt={item.name} className="w-full h-24 object-cover rounded" />
                  <div className="mt-1 flex items-center justify-between text-xs px-1">
                    {item.status === 'uploading' && <span className="text-blue-600 font-medium">Uploading...</span>}
                    {item.status === 'done' && <span className="text-green-600 font-medium">✓ Ready</span>}
                    {item.status === 'error' && <span className="text-red-600 font-medium" title={item.error}>✕ Failed</span>}
                    <button type="button" onClick={() => handleRemoveUpload(item.id)} className="text-gray-400 hover:text-red-600 font-bold">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {state.fieldErrors?.mediaKeys && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.mediaKeys}</p>
          )}
        </div>

        {/* GPS Location */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Grievance Location <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            We use your device&apos;s GPS to pinpoint the exact issue location. This helps officers find and fix the problem.
          </p>

          {location ? (
            <div className="space-y-2">
              {/* Location summary */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                    📍 Location Pinned
                    {location.accuracy && (
                      <span className="text-[10px] font-normal text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        ±{location.accuracy}m accuracy
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setLocation(null); setShowManual(false); }}
                    className="text-xs text-gray-500 hover:text-red-600 underline font-medium"
                  >
                    Reset
                  </button>
                </div>

                {/* Coordinates */}
                <div className="text-xs font-mono text-green-700 bg-green-100/50 rounded-lg px-3 py-1.5">
                  Lat: {location.lat.toFixed(6)} | Lng: {location.lng.toFixed(6)}
                </div>

                {/* Address details */}
                {location.displayName && (
                  <div className="text-sm text-green-800 leading-relaxed">
                    <span className="font-medium">📍 Address: </span>
                    {location.address || location.displayName}
                  </div>
                )}

                {(location.area || location.city || location.state) && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {location.area && (
                      <span className="bg-white border border-green-200 rounded px-2 py-0.5 text-green-700">
                        🏘️ {location.area}
                      </span>
                    )}
                    {location.city && (
                      <span className="bg-white border border-green-200 rounded px-2 py-0.5 text-green-700">
                        🏙️ {location.city}
                      </span>
                    )}
                    {location.state && (
                      <span className="bg-white border border-green-200 rounded px-2 py-0.5 text-green-700">
                        🗺️ {location.state}
                      </span>
                    )}
                    {location.pincode && (
                      <span className="bg-white border border-green-200 rounded px-2 py-0.5 text-green-700">
                        📮 {location.pincode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary: GPS button */}
              <button
                type="button"
                onClick={requestLocation}
                disabled={geoLoading}
                className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl text-sm hover:bg-blue-50 font-medium text-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {geoLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    Detecting your location...
                  </>
                ) : (
                  <>📡 Use GPS — Detect My Exact Location</>
                )}
              </button>

              {/* Manual entry toggle */}
              {!showManual && (
                <button
                  type="button"
                  onClick={() => setShowManual(true)}
                  className="text-xs text-gray-500 hover:text-blue-600 underline"
                >
                  Or enter coordinates manually
                </button>
              )}

              {/* Manual coordinate fields */}
              {showManual && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-medium text-slate-600">Enter coordinates manually:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        placeholder="e.g. 30.7333"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        placeholder="e.g. 76.7794"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualLocation}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                  >
                    Set Location
                  </button>
                </div>
              )}
            </div>
          )}

          {geoError && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
              {geoError}
            </div>
          )}

          {!location && state.fieldErrors?.['location.coordinates'] && (
            <p className="text-sm text-red-600 mt-1">Please set your location before submitting.</p>
          )}
        </div>

        {/* Anonymous checkbox */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <input id="anonymous" name="anonymous" type="checkbox" className="rounded" />
          <label htmlFor="anonymous" className="text-sm text-slate-700">
            Submit anonymously (your identity will be hidden from public view)
          </label>
        </div>

        <button
          type="submit"
          disabled={pending || isUploading || !location}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm transition-colors"
        >
          {pending ? '📤 Submitting...' : isUploading ? '⏳ Uploading photos...' : '📨 Submit Complaint'}
        </button>
      </form>
    </div>
  );
}
