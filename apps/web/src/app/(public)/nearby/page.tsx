'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  SANITATION: '🧹', ROADS: '🛣️', WATER: '💧', ELECTRICITY: '⚡',
  STREET_LIGHTING: '💡', TRAFFIC: '🚦', PARKS: '🌳', PUBLIC_HEALTH: '🏥',
  STRAY_ANIMALS: '🐕', ENCROACHMENT: '🏗️', OTHER: '📋',
};

const CATEGORY_COLORS: Record<string, string> = {
  SANITATION: '#16a34a', ROADS: '#d97706', WATER: '#2563eb', ELECTRICITY: '#eab308',
  STREET_LIGHTING: '#f59e0b', TRAFFIC: '#dc2626', PARKS: '#059669',
  PUBLIC_HEALTH: '#7c3aed', STRAY_ANIMALS: '#a16207', ENCROACHMENT: '#6b7280', OTHER: '#6b7280',
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

/** Minimal Leaflet type for CDN-loaded library */
interface LeafletStatic {
  map(el: HTMLElement): LeafletMap;
  tileLayer(url: string, opts: Record<string, unknown>): { addTo(map: unknown): void };
  marker(latlng: [number, number], opts?: Record<string, unknown>): LeafletMarker;
  divIcon(opts: Record<string, unknown>): unknown;
  circle(latlng: [number, number], opts: Record<string, unknown>): { addTo(map: unknown): { remove(): void } };
  latLngBounds(latlngs: [number, number][]): LeafletBounds;
}
interface LeafletMap { setView(latlng: [number, number], zoom: number): LeafletMap; fitBounds(b: unknown): void; remove(): void }
interface LeafletMarker { addTo(map: unknown): LeafletMarker; bindPopup(html: string, opts?: Record<string, unknown>): LeafletMarker; on(event: string, fn: () => void): void; remove(): void }
interface LeafletBounds { extend(latlng: [number, number]): void; pad(n: number): LeafletBounds }

function leaflet(): LeafletStatic | null {
  if (typeof window === 'undefined' || !('L' in window)) return null;
  return (window as unknown as { L: LeafletStatic }).L;
}

export default function NearbyPage() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [complaints, setComplaints] = useState<NearbyComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Array<{ remove: () => void }>>([]);

  // Load Leaflet CSS & JS via CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (leaflet()) { setLeafletReady(true); return; }

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.crossOrigin = '';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);

    return () => { css.remove(); script.remove(); };
  }, []);

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
        address: [addr.road, addr.neighbourhood || addr.suburb, addr.city || addr.town].filter(Boolean).join(', '),
        city: addr.city || addr.town || addr.county || addr.state || '',
      };
    } catch { return {}; }
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
      const items = (data.complaints || []).map((c: NearbyComplaint) => ({
        ...c,
        distance: c.location?.coordinates
          ? Math.round(haversineDistance(lat, lng, c.location.coordinates[1], c.location.coordinates[0]))
          : undefined,
      }));
      items.sort((a: NearbyComplaint, b: NearbyComplaint) => (a.distance || 0) - (b.distance || 0));
      setComplaints(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        setLocation({ lat, lng, accuracy, ...geo });
        setGeoLoading(false);
        fetchNearby(lat, lng, radius);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Please check your GPS or network connection.');
            break;
          default:
            setGeoError('Could not determine your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [reverseGeocode, fetchNearby, radius]);

  useEffect(() => { requestLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize / update Leaflet map
  useEffect(() => {
    const L = leaflet();
    if (!L || !mapRef.current || !location) return;

    // Create map if not exists
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([location.lat, location.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    } else {
      (mapInstanceRef.current as LeafletMap).setView([location.lat, location.lng], 14);
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // User location marker
    const userIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:4px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
      </div><style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userMarker = L.marker([location.lat, location.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong>📍 Your Location</strong><br/>${location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}<br/><small>Accuracy: ±${location.accuracy || '?'}m</small>`);
    markersRef.current.push(userMarker as { remove: () => void });

    // Radius circle
    const circle = L.circle([location.lat, location.lng], {
      radius: radius, color: '#3b82f6', fillColor: '#3b82f6',
      fillOpacity: 0.05, weight: 1, dashArray: '5, 5',
    }).addTo(map);
    markersRef.current.push(circle);

    // Complaint markers
    complaints.forEach((c) => {
      if (!c.location?.coordinates) return;
      const [cLng, cLat] = c.location.coordinates;
      const cat = c.category || c.citizenCategory || 'OTHER';
      const catColor = CATEGORY_COLORS[cat] || '#6b7280';
      const catIcon = CATEGORY_ICONS[cat] || '📋';
      const statusInfo = STATUS_LABELS[c.status] || { label: c.status };
      const dist = c.distance !== undefined
        ? (c.distance >= 1000 ? `${(c.distance / 1000).toFixed(1)} km` : `${c.distance}m`) : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${catColor};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">${catIcon}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });

      const marker = L.marker([cLat, cLng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:200px">
            <strong style="font-size:13px">${c.title}</strong><br/>
            <span style="display:inline-block;margin:4px 0;padding:1px 6px;border-radius:9999px;font-size:11px;background:#f3f4f6;">${statusInfo.label}</span>
            <span style="display:inline-block;margin:4px 0 4px 4px;font-size:11px;color:#6b7280">${catIcon} ${cat}</span><br/>
            ${dist ? `<span style="font-size:11px;color:#2563eb;font-weight:600">📍 ${dist} away</span><br/>` : ''}
            <a href="/track/${c.publicId}" style="display:inline-block;margin-top:6px;padding:4px 12px;background:#2563eb;color:white;border-radius:8px;font-size:12px;text-decoration:none;font-weight:500">Track →</a>
          </div>`, { closeButton: true });

      marker.on('click', () => setActivePin(c.publicId));
      markersRef.current.push(marker as { remove: () => void });
    });

    // Fit bounds
    if (complaints.length > 0) {
      const bounds = L.latLngBounds([[location.lat, location.lng]]);
      complaints.forEach((c) => {
        if (c.location?.coordinates) {
          bounds.extend([c.location.coordinates[1], c.location.coordinates[0]]);
        }
      });
      (map as LeafletMap).fitBounds(bounds.pad(0.1));
    }
  }, [leafletReady, location, complaints, radius]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as LeafletMap).remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (location) fetchNearby(location.lat, location.lng, newRadius);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Nearby Civic Issues</h1>
        <p className="text-gray-600 mt-1">Live grievances reported near your current GPS location, displayed on an interactive map.</p>
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
              <select value={radius} onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="text-xs border border-green-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-green-400 focus:outline-none">
                <option value={500}>500m radius</option>
                <option value={1000}>1 km radius</option>
                <option value={2000}>2 km radius</option>
                <option value={5000}>5 km radius</option>
                <option value={10000}>10 km radius</option>
              </select>
              <button onClick={requestLocation}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
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
                <p className="text-sm text-slate-600">Allow location access to see civic issues near you on an interactive map.</p>
                <button onClick={requestLocation}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
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

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">⚠️ {error}</div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <span className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Searching nearby issues...</span>
        </div>
      ) : location && complaints.length === 0 ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div ref={mapRef} className="w-full min-h-[400px] lg:min-h-[500px]" />
          </div>
          <div className="p-16 text-center bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center">
            <div className="text-4xl mb-4">🏙️</div>
            <p className="text-base font-medium text-slate-700">No issues found nearby</p>
            <p className="text-sm text-slate-500 mt-1">
              No civic complaints within {radius >= 1000 ? `${radius / 1000} km` : `${radius}m`} of your location. Try increasing the search radius.
            </p>
          </div>
        </div>
      ) : complaints.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {complaints.length} issue{complaints.length !== 1 ? 's' : ''} found nearby
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sorted by distance</span>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-500 ml-3">
                {['ROADS', 'WATER', 'SANITATION', 'ELECTRICITY'].map((cat) => (
                  <span key={cat} className="flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm order-1">
              <div ref={mapRef} className="w-full min-h-[400px] lg:min-h-[500px]" />
            </div>
            <div className="space-y-3 order-2 max-h-[500px] overflow-y-auto pr-1">
              {complaints.map((c) => {
                const statusInfo = STATUS_LABELS[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-800' };
                const cat = c.category || c.citizenCategory || 'OTHER';
                const icon = CATEGORY_ICONS[cat] || '📋';
                const isActive = activePin === c.publicId;
                return (
                  <Link key={c.publicId} href={`/track/${c.publicId}`}
                    className={`block p-4 bg-white border rounded-xl hover:border-blue-300 hover:shadow-sm transition-all ${isActive ? 'border-blue-400 shadow-md ring-1 ring-blue-200' : 'border-gray-200'}`}>
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
