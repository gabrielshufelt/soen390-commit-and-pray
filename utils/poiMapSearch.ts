import { fetchCategoryResult } from './poiFetch';
import { getBuildingCoordinate } from './buildingCoordinates';
import { getDistanceMeters } from './geometry';
import { CATEGORY_TO_GOOGLE_TYPE, POI_CATEGORIES, STUDY_SPACE_CONFIG } from '@/constants/poiCategories';
import type { CategoryKey } from '@/constants/poiCategories';
import type { Coordinates, POI } from '@/constants/poi.types';

const MAX_MAP_POIS = 5;

const recomputeDistances = (pois: POI[], coords: Coordinates): POI[] =>
  pois
    .map((poi) => ({
      ...poi,
      distance: getDistanceMeters(coords.latitude, coords.longitude, poi.latitude, poi.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);

const buildAllStudySpacePois = (currentCoords: Coordinates): POI[] => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  return STUDY_SPACE_CONFIG
    .flatMap((space) => {
      const coordinate = getBuildingCoordinate(space.code);
      if (!coordinate) return [];
      const isOpen = space.openDays.includes(day) && hour >= space.openHour && hour < space.closeHour;
      return [{
        id: space.id,
        name: space.name,
        address: space.address,
        isOpen,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        source: 'study' as const,
        pricing: 'Free',
        categoryLabel: POI_CATEGORIES.study.title,
        distance: getDistanceMeters(
          currentCoords.latitude, currentCoords.longitude,
          coordinate.latitude, coordinate.longitude,
        ),
      }];
    })
    .sort((a, b) => a.distance - b.distance);
};

export const searchPoisForMap = async (
  categoryKey: CategoryKey,
  currentCoords: Coordinates,
  apiKey: string,
): Promise<{ pois: POI[]; error: string | null }> => {
  try {
    if (categoryKey === 'study') {
      const pois = buildAllStudySpacePois(currentCoords);
      return { pois: pois.slice(0, MAX_MAP_POIS), error: null };
    }

    const googleType = CATEGORY_TO_GOOGLE_TYPE[categoryKey];
    if (!googleType) {
      return { pois: [], error: `Unknown category: ${categoryKey}` };
    }
    if (!apiKey) {
      return { pois: [], error: 'Missing Google Maps API key' };
    }

    const result = await fetchCategoryResult(categoryKey, googleType, currentCoords, apiKey);
    if ('error' in result) {
      return { pois: [], error: result.error };
    }

    const sorted = recomputeDistances(result.pois, currentCoords);
    return { pois: sorted.slice(0, MAX_MAP_POIS), error: null };
  } catch (error) {
    return {
      pois: [],
      error: error instanceof Error ? error.message : 'Failed to search POIs',
    };
  }
};
