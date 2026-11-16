'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  ANALYZING: { label: 'Analyzing', color: 'bg-yellow-100 text-yellow-800' },
  NEEDS_REVIEW: { label: 'Needs Review', color: 'bg-orange-100 text-orange-800' },
  ROUTED: { label: 'Routed', color: 'bg-purple-100 text-purple-800' },
  ASSIGNED: { label: 'Assigned', color: 'bg-indigo-100 text-indigo-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-teal-100 text-teal-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  REOPENED: { label: 'Reopened', color: 'bg-red-100 text-red-800' },
  LINKED_DUPLICATE: { label: 'Duplicate', color: 'bg-gray-100 text-gray-600' },
};

const CATEGORY_ICONS: Record<string, string> = {
  SANITATION: '🧹',
  ROADS: '🛣️',
  WATER: '💧',
  ELECTRICITY: '⚡',
  STREET_LIGHTING: '💡',
  TRAFFIC: '🚦',
  PARKS: '🌳',
  PUBLIC_HEALTH: '🏥',
  STRAY_ANIMALS: '🐕',
  ENCROACHMENT: '🏗️',
  OTHER: '📋',
};

interface NearbyComplaint {
  publicId: string;
  title: string;
  status: string;
  category?: string;
  citizenCategory?: string;
  location: { type: string; coordinates: [number, number] };
  createdAt: string;
  upvotes: number;
  distance?: number;
}

interface LocationInfo {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  city?: string;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyPage() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [complaints, setComplaints] = useState<NearbyComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(2000);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { 'User-Agent': 'NagrikSetu/1.0' } }
      );
      if (!res.ok) return {};
      const data = await res.json();
      const addr = data.address || {};
      return {
        address: [addr.road, addr.neighbourhood || addr.suburb].filter(Boolean).join(', '),
        city: addr.city || addr.town || addr.county || '',
      };
    } catch {
      return {};
    }
  }, []);

  const fetchNearby = useCallback(async (lat: number, lng: number, rad: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const items = (data.complaints || []).map((c: any) => ({
        ...c,
        distance: c.location?.coordinates
          ? Math.round(haversineDistance(lat, lng, c.location.coordinates[1], c.location.coordinates[0]))
          : undefined,
      }));
      items.sort((a: NearbyComplaint, b: NearbyComplaint) => (a.distance || 0) - (b.distance || 0));
      setComplaints(items);
    } catch (err: any) {
      setError(err.message);
      setComplaints([]);
    }
    setLoading(false);
  }, []);

  const requestLocation = useCallback(() => {
    setGeoError(null);
    setGeoLoading(true);

    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        const geo = await reverseGeocode(lat, lng);
        const loc = { lat, lng, accuracy, ...geo };
        setLocation(loc);
        setGeoLoading(false);
        fetchNearby(lat, lng, radius);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow location access in browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Check your GPS or network.');
            break;
          default:
            setGeoError('Could not determine location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [reverseGeocode, fetchNearby, radius]);

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (location) fetchNearby(location.lat, location.lng, newRadius);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nearby Civic Issues</h1>
        <p className="text-gray-600 mt-1">
          Live grievances reported near your current location.
        </p>
      </div>

      {/* Location Status Bar */}
      <div className={`p-4 rounded-xl border ${location ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
        {location ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                📍 GPS Active — {location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                {location.city && <span className="text-green-600">({location.city})</span>}
              </div>
              <p className="text-xs text-green-600 mt-0.5">
                Accuracy: ±{location.accuracy || '?'}m | Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={radius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="text-xs border border-green-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-green-400 focus:outline-none"
              >
                <option value={500}>500m radius</option>
                <option value={1000}>1 km radius</option>
                <option value={2000}>2 km radius</option>
                <option value={5000}>5 km radius</option>
              </select>
              <button
                onClick={requestLocation}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
              >
                🔄 Re-detect
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            {geoLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                <span className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                Detecting your GPS location...
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600">Allow location access to see civic issues near you.</p>
                <button
                  onClick={requestLocation}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  📡 Enable GPS Location
                </button>
              </>
            )}
            {geoError && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{geoError}</p>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <span className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Searching nearby issues...</span>
        </div>
      ) : location && complaints.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl">
          <div className="text-4xl mb-4">🏙️</div>
          <p className="text-base font-medium text-slate-700">No issues found nearby</p>
          <p className="text-sm text-slate-500 mt-1">
            No civic complaints within {radius >= 1000 ? `${radius / 1000} km` : `${radius}m`} of your location. Try increasing the search radius.
          </p>
        </div>
      ) : complaints.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {complaints.length} issue{complaints.length !== 1 ? 's' : ''} found nearby
            </h3>
            <span className="text-xs text-gray-500">Sorted by distance</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Map placeholder */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-5 min-h-[400px]">
              <div className="flex items-center justify-between pb-3 border-b mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">📍 Issue Locations</h3>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                  {complaints.length} pins
                </span>
              </div>

              {/* Your location */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3 text-xs">
                <span className="font-medium text-blue-800">📍 Your Location:</span>{' '}
                <span className="text-blue-700">{location?.address || `${location?.lat.toFixed(5)}, ${location?.lng.toFixed(5)}`}</span>
              </div>

              {/* Complaint pins */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {complaints.map((c) => {
                  const cat = c.category || c.citizenCategory || 'OTHER';
                  const icon = CATEGORY_ICONS[cat] || '📋';
                  return (
                    <div key={c.publicId} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span className="text-base">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{c.title}</p>
                        <p className="text-slate-500">
                          {c.location?.coordinates && (
                            <span>{c.location.coordinates[1].toFixed(4)}, {c.location.coordinates[0].toFixed(4)}</span>
                          )}
                        </p>
                      </div>
                      {c.distance !== undefined && (
                        <span className="font-semibold text-blue-700 whitespace-nowrap">
                          {c.distance >= 1000 ? `${(c.distance / 1000).toFixed(1)} km` : `${c.distance}m`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {complaints.map((c) => {
                const statusInfo = STATUS_LABELS[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-800' };
                const cat = c.category || c.citizenCategory || 'OTHER';
                const icon = CATEGORY_ICONS[cat] || '📋';
                return (
                  <Link
                    key={c.publicId}
                    href={`/track/${c.publicId}`}
                    className="block p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm leading-snug">{c.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{icon} {cat}</span>
                      <span className="flex items-center gap-3">
                        {c.distance !== undefined && (
                          <span className="font-semibold text-blue-600">
                            📍 {c.distance >= 1000 ? `${(c.distance / 1000).toFixed(1)} km` : `${c.distance}m`}
                          </span>
                        )}
                        <span>👍 {c.upvotes || 0}</span>
                        <span className="text-blue-600 font-medium">Track →</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
