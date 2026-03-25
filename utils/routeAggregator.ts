import { parseBuildingLocation } from "./buildingParser";
import { getBuildingCoordinate } from "./buildingCoordinates";
import { IndoorPathfinder } from "./indoorPathfinder";
import { AllCampusData } from "../data/buildings";
import { getDistanceMeters } from "./geometry";

export type CombinedNavigationStep = {
  instruction: string;
  distance: string; 
  source: "indoor" | "outdoor";
  buildingCode?: string;
  floor?: number;
  coordinates: { latitude: number; longitude: number };
  maneuver?: string;
};

const pathfinder = new IndoorPathfinder(AllCampusData);

function findBestEntryNode(buildingCode: string, referencePoint: { latitude: number; longitude: number }, transportMode: string) {
  const buildingFloors = AllCampusData.filter(f => f.meta.buildingId === buildingCode);
  const allEntries = buildingFloors.flatMap(f => f.nodes.filter(n => n.type === 'building_entry'));

  if (allEntries.length === 0) return null;

  if (buildingCode === 'MB' && transportMode === 'TRANSIT') {
    const s2Entry = allEntries.find(n => n.floor === -2);
    if (s2Entry) return s2Entry;
  }

  return allEntries.sort((a, b) => {
    const distA = getDistanceMeters(referencePoint.latitude, referencePoint.longitude, a.latitude!, a.longitude!);
    const distB = getDistanceMeters(referencePoint.latitude, referencePoint.longitude, b.latitude!, b.longitude!);
    return distA - distB;
  })[0];
}

export async function getStitchedRoute(
  originRaw: string,
  destinationRaw: string,
  isAccessible: boolean,
  transportMode: string,
  userLocation: { latitude: number; longitude: number },
  fetchOutdoorSteps: (s: any, e: any) => Promise<any[]>
): Promise<CombinedNavigationStep[]> {
  const origin = parseBuildingLocation(originRaw);
  const dest = parseBuildingLocation(destinationRaw);
  if (!dest) return [];

  const route: CombinedNavigationStep[] = [];
  let outdoorStart = userLocation;

  // Leg 1: Indoor Exit
  if (origin?.room) {
    const bestExit = findBestEntryNode(origin.buildingCode, userLocation, transportMode);
    if (bestExit) {
      const indoorPath = pathfinder.findShortestPath(origin.room, bestExit.label, isAccessible);
      indoorPath.forEach(n => route.push({
        instruction: `Exit ${origin.buildingCode} via ${bestExit.label}`,
        distance: "5m", source: "indoor", buildingCode: n.buildingId, floor: n.floor,
        coordinates: { latitude: n.latitude!, longitude: n.longitude! }
      }));
      outdoorStart = { latitude: bestExit.latitude!, longitude: bestExit.longitude! };
    }
  }

  // Leg 2: Outdoor
  let outdoorEnd = getBuildingCoordinate(dest.buildingCode) || { latitude: 0, longitude: 0 };
  const bestEntry = findBestEntryNode(dest.buildingCode, outdoorStart, transportMode);
  if (bestEntry) outdoorEnd = { latitude: bestEntry.latitude!, longitude: bestEntry.longitude! };

  const outdoorSteps = await fetchOutdoorSteps(outdoorStart, outdoorEnd);
  outdoorSteps.forEach(s => route.push({ ...s, source: "outdoor" }));

  // Leg 3: Indoor Arrival
  if (dest.room && bestEntry) {
    const arrivalPath = pathfinder.findShortestPath(bestEntry.label, dest.room, isAccessible);
    arrivalPath.forEach(n => route.push({
      instruction: `Head to ${dest.room}`,
      distance: "5m", source: "indoor", buildingCode: n.buildingId, floor: n.floor,
      coordinates: { latitude: n.latitude!, longitude: n.longitude! }
    }));
  }

  return route;
}