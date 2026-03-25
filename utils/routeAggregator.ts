import { parseBuildingLocation } from "./buildingParser";
import { getBuildingCoordinate } from "./buildingCoordinates";
import { IndoorPathfinder } from "./indoorPathfinder";
import { AllCampusData } from "../data/buildings";
import { getDistanceMeters } from "./geometry";

export type CombinedNavigationStep = {
  instruction: string;
  distance: string; 
  source: "indoor" | "outdoor";
  duration?: string;
  nodeId?: string;
  nodeLabel?: string;
  startNodeId?: string;
  startNodeLabel?: string;
  endNodeId?: string;
  endNodeLabel?: string;
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
      const indoorPath = pathfinder.findShortestPath(origin.room, bestExit.id, {
        wheelchairAccessible: isAccessible,
        avoidStairs: isAccessible,
        preferElevators: isAccessible,
      });
      if (indoorPath?.length) {
        const startNode = indoorPath[0];
        const endNode = indoorPath[indoorPath.length - 1];
        route.push({
          instruction: `Exit ${origin.buildingCode} via ${bestExit.label}`,
          distance: `${Math.max(1, indoorPath.length - 1) * 5}m`,
          source: "indoor",
          buildingCode: endNode.buildingId,
          floor: endNode.floor,
          nodeId: endNode.id,
          nodeLabel: endNode.label,
          startNodeId: startNode.id,
          startNodeLabel: startNode.label,
          endNodeId: endNode.id,
          endNodeLabel: endNode.label,
          coordinates: { latitude: endNode.latitude!, longitude: endNode.longitude! },
        });
        outdoorStart = { latitude: endNode.latitude!, longitude: endNode.longitude! };
      }
    }
  }

  // Leg 2: Outdoor
  let outdoorEnd = getBuildingCoordinate(dest.buildingCode) || { latitude: 0, longitude: 0 };
  const bestEntry = findBestEntryNode(dest.buildingCode, outdoorStart, transportMode);
  if (bestEntry) outdoorEnd = { latitude: bestEntry.latitude!, longitude: bestEntry.longitude! };

  const outdoorSteps = await fetchOutdoorSteps(outdoorStart, { 
  ...outdoorEnd, 
  transportMode 
  });

  outdoorSteps.forEach(s => route.push({ ...s, source: "outdoor" }));

  // Leg 3: Indoor Arrival
  if (dest.room && bestEntry) {
    const arrivalPath = pathfinder.findShortestPath(bestEntry.id, dest.room, {
      wheelchairAccessible: isAccessible,
      avoidStairs: isAccessible,
      preferElevators: isAccessible,
    });
    if (arrivalPath?.length) {
      const startNode = arrivalPath[0];
      const endNode = arrivalPath[arrivalPath.length - 1];
      route.push({
        instruction: `Head to ${dest.room}`,
        distance: `${Math.max(1, arrivalPath.length - 1) * 5}m`,
        source: "indoor",
        buildingCode: endNode.buildingId,
        floor: endNode.floor,
        nodeId: endNode.id,
        nodeLabel: endNode.label,
        startNodeId: startNode.id,
        startNodeLabel: startNode.label,
        endNodeId: endNode.id,
        endNodeLabel: endNode.label,
        coordinates: { latitude: endNode.latitude!, longitude: endNode.longitude! },
      });
    }
  }

  return route;
}