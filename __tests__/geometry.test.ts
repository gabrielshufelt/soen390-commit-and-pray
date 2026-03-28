import { getDistanceMeters, getInteriorPoint, isPointInPolygon } from '../utils/geometry';

describe('geometry utilities', () => {
  describe('getDistanceMeters', () => {
    it('returns 0 for identical points', () => {
      const lat = 45.4972;
      const lng = -73.579;

      const distance = getDistanceMeters(lat, lng, lat, lng);

      expect(distance).toBe(0);
    });

    it('is symmetric between point A and point B', () => {
      const a = { lat: 45.4972, lng: -73.579 };
      const b = { lat: 45.495, lng: -73.577 };

      const ab = getDistanceMeters(a.lat, a.lng, b.lat, b.lng);
      const ba = getDistanceMeters(b.lat, b.lng, a.lat, a.lng);

      expect(Math.abs(ab - ba)).toBeLessThan(1e-9);
    });

    it('matches a known real-world distance approximately', () => {
      
      const a = { lat: 45.4972, lng: -73.579 };
      const b = { lat: 45.495, lng: -73.577 };

      const distance = getDistanceMeters(a.lat, a.lng, b.lat, b.lng);

      
      expect(distance).toBeGreaterThan(280);
      expect(distance).toBeLessThan(310);
    });

    it('returns larger values for farther points', () => {
      const origin = { lat: 45.4972, lng: -73.579 };
      const near = { lat: 45.4974, lng: -73.5791 };
      const far = { lat: 45.5072, lng: -73.589 };

      const nearDistance = getDistanceMeters(origin.lat, origin.lng, near.lat, near.lng);
      const farDistance = getDistanceMeters(origin.lat, origin.lng, far.lat, far.lng);

      expect(farDistance).toBeGreaterThan(nearDistance);
    });

    it('returns a finite and non-negative value for very small deltas', () => {
      const a = { lat: 45.4972, lng: -73.579 };
      const b = { lat: 45.4972001, lng: -73.5790001 };

      const distance = getDistanceMeters(a.lat, a.lng, b.lat, b.lng);

      expect(Number.isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(1);
    });
  });

  describe('polygon helpers sanity', () => {
    const square = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];

    it('isPointInPolygon identifies inside/outside points', () => {
      expect(isPointInPolygon({ latitude: 1, longitude: 1 }, square)).toBe(true);
      expect(isPointInPolygon({ latitude: 3, longitude: 3 }, square)).toBe(false);
    });

    it('getInteriorPoint returns a point inside a convex polygon', () => {
      const inside = getInteriorPoint(square);

      expect(isPointInPolygon(inside, square)).toBe(true);
      expect(inside.latitude).toBeGreaterThan(0);
      expect(inside.latitude).toBeLessThan(2);
      expect(inside.longitude).toBeGreaterThan(0);
      expect(inside.longitude).toBeLessThan(2);
    });
  });
});
