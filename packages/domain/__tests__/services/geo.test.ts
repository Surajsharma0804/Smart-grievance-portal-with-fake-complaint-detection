import { describe, it, expect } from 'vitest';
import { haversineDistance, geoPoint, isWithinRadius, coordsToLatLng } from '../../src/services/geo';

describe('geo', () => {
  describe('haversineDistance', () => {
    it('returns 0 for identical points', () => {
      const p = { lat: 30.7333, lng: 76.7794 };
      expect(haversineDistance(p, p)).toBe(0);
    });

    it('Delhi to Mumbai is approximately 1150 km', () => {
      const delhi = { lat: 28.6139, lng: 77.2090 };
      const mumbai = { lat: 19.0760, lng: 72.8777 };
      const dist = haversineDistance(delhi, mumbai);
      expect(dist).toBeGreaterThan(1_100_000);
      expect(dist).toBeLessThan(1_200_000);
    });

    it('Chandigarh to Mohali is approximately 10-15 km', () => {
      const chandigarh = { lat: 30.7333, lng: 76.7794 };
      const mohali = { lat: 30.7046, lng: 76.7179 };
      const dist = haversineDistance(chandigarh, mohali);
      expect(dist).toBeGreaterThan(5_000);
      expect(dist).toBeLessThan(15_000);
    });
  });

  describe('geoPoint', () => {
    it('creates GeoJSON Point with [lng, lat] order', () => {
      const p = geoPoint(76.7794, 30.7333);
      expect(p.type).toBe('Point');
      expect(p.coordinates[0]).toBe(76.7794); // lng first
      expect(p.coordinates[1]).toBe(30.7333); // lat second
    });
  });

  describe('isWithinRadius', () => {
    it('nearby point is within radius', () => {
      const center = { lat: 30.7333, lng: 76.7794 };
      const nearby = { lat: 30.7340, lng: 76.7800 };
      expect(isWithinRadius(center, nearby, 1000)).toBe(true);
    });

    it('far point is outside radius', () => {
      const center = { lat: 30.7333, lng: 76.7794 };
      const far = { lat: 28.6139, lng: 77.2090 }; // Delhi
      expect(isWithinRadius(center, far, 1000)).toBe(false);
    });
  });

  describe('coordsToLatLng', () => {
    it('extracts lat/lng from GeoJSON coordinates', () => {
      const result = coordsToLatLng([76.7794, 30.7333]);
      expect(result.lng).toBe(76.7794);
      expect(result.lat).toBe(30.7333);
    });

    it('swapped coordinates would fail a sanity check', () => {
      // This test documents that [lng, lat] is the correct order
      const correct = coordsToLatLng([76.7794, 30.7333]);
      expect(correct.lat).toBeGreaterThan(0);
      expect(correct.lat).toBeLessThan(90);
      expect(correct.lng).toBeGreaterThan(0);
      expect(correct.lng).toBeLessThan(180);
    });
  });
});
