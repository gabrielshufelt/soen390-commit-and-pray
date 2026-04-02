import { AllCampusData } from "../data/buildings";
import { getDistanceMeters } from "./geometry";
import { getBuildingCoordinate } from "./buildingCoordinates";

export const POI_TYPE_MAP: Record<string, string[]> = {
  washroom: ["washroom", "bathroom", "restroom"],
  water: ["water_fountain", "water"],
  elevator: ["elevator_door", "elevator"],
  stairs: ["stair_landing", "stairwell"],
  food: ["vending_machine"],
  vending: ["vending_machine"],
  "vending machine": ["vending_machine"],
};

const toDisplayName = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type IndoorPoiNode = {
  id: string;
  type: string;
  label?: string;
  latitude?: number;
  longitude?: number;
};

export interface PoiResult {
  id: string;
  name: string;
  type: string;
  buildingCode: string;
  floor: number;
  distance: number;
  coordinates: { latitude: number; longitude: number };
}

export function searchNearbyPois(
  keyword: string,
  userLat: number,
  userLng: number,
  currentBuildingCode: string | null
): PoiResult[] {
  const query = keyword.toLowerCase().trim();
  const targetTypes = POI_TYPE_MAP[query];

  if (!targetTypes) return [];

  const results: PoiResult[] = [];

  const dataToSearch = currentBuildingCode 
    ? AllCampusData.filter(f => f.meta.buildingId === currentBuildingCode)
    : AllCampusData;

  dataToSearch.forEach(floor => {
    // Get the building center as a fallback since indoor nodes usually only have x/y
    const buildingFallback = getBuildingCoordinate(floor.meta.buildingId);

    floor.nodes.forEach((node: IndoorPoiNode) => {
      if (targetTypes.includes(node.type)) {
        // Use node GPS if available, otherwise use building GPS
        const lat = node.latitude || buildingFallback?.latitude;
        const lng = node.longitude || buildingFallback?.longitude;

        if (lat && lng) {
          results.push({
            id: node.id,
            name: toDisplayName(node.label?.trim() || node.type),
            type: node.type,
            buildingCode: floor.meta.buildingId,
            floor: floor.meta.floor,
            distance: getDistanceMeters(userLat, userLng, lat, lng),
            coordinates: { latitude: lat, longitude: lng }
          });
        }
      }
    });
  });

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, 5);
}
