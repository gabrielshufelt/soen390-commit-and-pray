import { getDistanceMeters, getInteriorPoint, isPointInPolygon, getMinimumTapTargetBuffer } from '../utils/geometry';

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

  describe('getMinimumTapTargetBuffer', () => {
    it('returns 0 for buildings larger than minimum threshold', () => {
      // Large building (0.01 x 0.01 degrees)
      const largeBuilding = [
        [-73.5, 45.5],
        [-73.49, 45.5],
        [-73.49, 45.51],
        [-73.5, 45.51],
      ];

      const buffer = getMinimumTapTargetBuffer(largeBuilding);
      expect(buffer).toBe(0);
    });

    it('returns positive buffer for small buildings', () => {
      // Small building (0.0001 x 0.0001 degrees, much smaller than 0.001)
      const smallBuilding = [
        [-73.5, 45.5],
        [-73.49999, 45.5],
        [-73.49999, 45.50001],
        [-73.5, 45.50001],
      ];

      const buffer = getMinimumTapTargetBuffer(smallBuilding);
      expect(buffer).toBeGreaterThan(0);
    });

    it('respects custom minRadiusDegrees parameter', () => {
      const building = [
        [-73.5, 45.5],
        [-73.49999, 45.5],
        [-73.49999, 45.50001],
        [-73.5, 45.50001],
      ];

      const buffer1 = getMinimumTapTargetBuffer(building, 0.0001);
      const buffer2 = getMinimumTapTargetBuffer(building, 0.001);

      // Larger minimum should result in larger or equal buffer
      expect(buffer2).toBeGreaterThanOrEqual(buffer1);
    });

    it('returns a minimum of 75% of minRadiusDegrees', () => {
      const verySmallBuilding = [
        [-73.5, 45.5],
        [-73.499999, 45.5],
        [-73.499999, 45.500001],
        [-73.5, 45.500001],
      ];

      const minRadius = 0.0005;
      const buffer = getMinimumTapTargetBuffer(verySmallBuilding, minRadius);

      // Should be at least 75% of minRadius
      expect(buffer).toBeGreaterThanOrEqual(minRadius * 0.75);
    });
  });
});
