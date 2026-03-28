import { AllCampusData } from "../data/buildings";
import { getDistanceMeters } from "./geometry";
import { getBuildingCoordinate } from "./buildingCoordinates";

const POI_TYPE_MAP: Record<string, string[]> = {
  "washroom": ["washroom", "bathroom", "restroom"],
  "water": ["water_fountain", "water"],
  "elevator": ["elevator_door", "elevator"],
  "stairs": ["stair_landing", "stairwell"],
  "food": ["dining", "cafe", "restaurant"]
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

    floor.nodes.forEach(node => {
      if (targetTypes.includes(node.type)) {
        // Use node GPS if available, otherwise use building GPS
        const lat = node.latitude || buildingFallback?.latitude;
        const lng = node.longitude || buildingFallback?.longitude;

        if (lat && lng) {
          results.push({
            id: node.id,
            name: node.label?.trim() || `${node.type.replace('_', ' ')}`,
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

  return results.sort((a, b) => a.distance - b.distance).slice(0, 5);
}
