// Returns the geographic centroid (lat/lng) of a campus building by its code.
// Used by useNextClass to request walking directions to the next class building.
//
// Coordinates are derived from the GeoJSON polygons in sgw.json / loyola.json
// using the same getInteriorPoint() utility that the map already uses.

import sgwData from '../data/buildings/sgw.json';
import loyolaData from '../data/buildings/loyola.json';
import { getInteriorPoint } from './geometry';

export interface BuildingCoordinate {
  latitude: number;
  longitude: number;
}

// Build a lookup map from building code -> centroid coordinate (computed once at module load)
const coordinateMap: Record<string, BuildingCoordinate> = {};

const allFeatures = [
  ...sgwData.features,
  ...loyolaData.features,
];

for (const feature of allFeatures) {
  const props = feature.properties as Record<string, unknown>;
  const code = (props.code ?? '') as string;
  if (!code) continue;

  try {
    const coords = (feature.geometry as { coordinates: number[][][] }).coordinates[0];
    const centroid = getInteriorPoint(coords);
    coordinateMap[code.toUpperCase()] = centroid;
  } catch {
    // Skip any malformed polygon, the feature simply won't be in the map
  }
}

// Get the geographic centre of a campus building by its code (e.g. "H", "MB", "CJ").
export function getBuildingCoordinate(buildingCode: string): BuildingCoordinate | null {
  return coordinateMap[buildingCode.toUpperCase()] ?? null;
}
