/**
 * Geospatial helpers: haversine distance, GeoJSON builders, radius checks.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two points in meters.
 * Points given as { lat, lng } in degrees.
 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Build a GeoJSON Point from longitude and latitude.
 * Coordinates in [lng, lat] order per GeoJSON spec.
 */
export function geoPoint(lng: number, lat: number): { type: 'Point'; coordinates: [number, number] } {
  return { type: 'Point', coordinates: [lng, lat] };
}

/**
 * Check if a point is within a given radius (meters) of another point.
 */
export function isWithinRadius(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  radiusM: number,
): boolean {
  return haversineDistance(center, point) <= radiusM;
}

/**
 * Extract lat/lng from a GeoJSON Point coordinates array.
 * GeoJSON stores as [lng, lat].
 */
export function coordsToLatLng(coordinates: [number, number]): { lat: number; lng: number } {
  return { lng: coordinates[0], lat: coordinates[1] };
}
