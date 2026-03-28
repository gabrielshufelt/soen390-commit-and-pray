import { AllCampusData } from "../data/buildings";
import { getDistanceMeters } from "./geometry";

// This maps user keywords to the "type" field in your JSON nodes.
// If your teammate adds "washroom" in Task #85, just add it here.
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

  // Filter: Look only in the current building if we are in one, 
  // otherwise look everywhere (to find "nearest building" POIs)
  const dataToSearch = currentBuildingCode 
    ? AllCampusData.filter(f => f.meta.buildingId === currentBuildingCode)
    : AllCampusData;

  dataToSearch.forEach(floor => {
    floor.nodes.forEach(node => {
      if (targetTypes.includes(node.type) && node.latitude && node.longitude) {
        results.push({
          id: node.id,
          name: node.label || `${node.type.replace('_', ' ')}`,
          type: node.type,
          buildingCode: floor.meta.buildingId,
          floor: floor.meta.floor,
          distance: getDistanceMeters(userLat, userLng, node.latitude, node.longitude),
          coordinates: { latitude: node.latitude, longitude: node.longitude }
        });
      }
    });
  });

  // Sort by distance and return top 5
  return results.sort((a, b) => a.distance - b.distance).slice(0, 5);
}
