import { findBuildingForLocation } from '../hooks/useUserBuilding';
import sgwBuildingsData from '../data/buildings/sgw.json';
import loyolaBuildingsData from '../data/buildings/loyola.json';
import { getInteriorPoint } from '../utils/geometry';

const allBuildings = [
  ...sgwBuildingsData.features,
  ...loyolaBuildingsData.features,
];

/**
 * Returns a point that is well outside any campus building
 * by offsetting from the polygon centroid.
 */
function getOutsidePoint(coords: number[][]): { latitude: number; longitude: number } {
  const centroid = getInteriorPoint(coords);
  return {
    latitude: centroid.latitude + 0.01, // ~1.1 km north — clearly outside
    longitude: centroid.longitude + 0.01,
  };
}

describe('findBuildingForLocation', () => {
  // ── Walk INTO every building ──────────────────────────────────────────
  describe('detects user inside each building (walk-in)', () => {
    allBuildings.forEach((building) => {
      const props = building.properties as Record<string, any>;
      const code = props.code ?? props.name ?? building.id;
      const coords = building.geometry.coordinates[0] as number[][];

      it(`should detect user inside building ${code}`, () => {
        const centroid = getInteriorPoint(coords);
        const result = findBuildingForLocation(centroid.latitude, centroid.longitude);

        expect(result).not.toBeNull();
        expect(result!.id).toBe(building.id);
        expect(result!.code).toBe(props.code ?? '');
      });
    });
  });

  // ── Walk OUT of every building ────────────────────────────────────────
  describe('detects user outside each building (walk-out)', () => {
    allBuildings.forEach((building) => {
      const props = building.properties as Record<string, any>;
      const code = props.code ?? props.name ?? building.id;
      const coords = building.geometry.coordinates[0] as number[][];

      it(`should NOT match building ${code} when user is outside`, () => {
        const outside = getOutsidePoint(coords);
        const result = findBuildingForLocation(outside.latitude, outside.longitude);

        // The result should either be null or a DIFFERENT building
        if (result) {
          expect(result.id).not.toBe(building.id);
        } else {
          expect(result).toBeNull();
        }
      });
    });
  });

  // ── Completely off-campus ─────────────────────────────────────────────
  it('should return null for a point far from any campus', () => {
    // Somewhere in the middle of the Atlantic Ocean
    const result = findBuildingForLocation(40.0, -50.0);
    expect(result).toBeNull();
  });

  it('should return null when downtown Montreal but not in a Concordia building', () => {
    // Random point on Sainte-Catherine Street, away from Concordia
    const result = findBuildingForLocation(45.508, -73.570);
    expect(result).toBeNull();
  });

  // ── Edge: boundary transitions ────────────────────────────────────────
  describe('boundary transitions (step in → step out)', () => {
    allBuildings.forEach((building) => {
      const props = building.properties as Record<string, any>;
      const code = props.code ?? props.name ?? building.id;
      const coords = building.geometry.coordinates[0] as number[][];

      it(`should transition correctly for building ${code}`, () => {
        const inside = getInteriorPoint(coords);
        const outside = getOutsidePoint(coords);

        // Step 1: user walks in
        const resultIn = findBuildingForLocation(inside.latitude, inside.longitude);
        expect(resultIn).not.toBeNull();
        expect(resultIn!.id).toBe(building.id);

        // Step 2: user walks out
        const resultOut = findBuildingForLocation(outside.latitude, outside.longitude);
        if (resultOut) {
          expect(resultOut.id).not.toBe(building.id);
        } else {
          expect(resultOut).toBeNull();
        }
      });
    });
  });
});