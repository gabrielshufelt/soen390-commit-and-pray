// Returns the geographic centroid (lat/lng) of a campus building by its code.
// Used by useNextClass to request walking directions to the next class building.
//
// Coordinates are derived from the GeoJSON polygons in sgw.json / loyola.json
// using the same getInteriorPoint() utility that the map already uses.

import sgwData from '../data/buildings/sgw.json';
import loyolaData from '../data/buildings/loyola.json';
import { getInteriorPoint } from './geometry';
import ccNav from '../data/buildings/CC/1-nav.json';
import hNav from '../data/buildings/H/1-nav.json';
import mbNav from '../data/buildings/MB/1-nav.json';
import vlNav from '../data/buildings/VL/1-nav.json';

export interface BuildingCoordinate {
  latitude: number;
  longitude: number;
}

// Build a lookup map from building code -> centroid coordinate (computed once at module load)
const coordinateMap: Record<string, BuildingCoordinate> = {};

// Build a lookup map for navigation data by building code
const navDataMap: Record<string, Record<string, unknown>> = {
  CC: ccNav,
  H: hNav,
  MB: mbNav,
  VL: vlNav,
};

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

export function getBuildingEntryCoordinates(buildingCode: string): BuildingCoordinate | null {
  try {
    const buildingCodeUpper = buildingCode.toUpperCase();
    const navData = navDataMap[buildingCodeUpper];

    if (!navData) {
      return null;
    }

    const nodes = navData?.nodes;
    if (!Array.isArray(nodes)) {
      return null;
    }

    const entryNode = nodes.find(
      (node: Record<string, unknown>) => node.type === 'building_entry'
    );

    if (!entryNode || typeof entryNode.latitude !== 'number' || typeof entryNode.longitude !== 'number') {
      return null;
    }

    return {
      latitude: entryNode.latitude as number,
      longitude: entryNode.longitude as number,
    };
  } catch {
    return null;
  }
}
