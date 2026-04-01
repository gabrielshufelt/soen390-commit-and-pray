import { getBuildingCoordinate } from './buildingCoordinates';
import { getDistanceMeters } from './geometry';
import { getCachedPOIs, setCachedPOIs } from './poiCache';
import {
  CATEGORY_TO_GOOGLE_TYPE,
  FETCH_MIN_DISTANCE_METERS,
  FETCH_RADIUS_METERS,
  POI_CATEGORIES,
  STUDY_SPACE_CONFIG,
} from '@/constants/poiCategories';
import type { CategoryKey } from '@/constants/poiCategories';
import type {
  CategoryFetchResult,
  Coordinates,
  GooglePlaceDetailsResponse,
  GooglePlacesNearbyResponse,
  GooglePlacesNearbyResult,
  POI,
  POICategory,
  StudySpaceConfig,
} from '@/constants/poi.types';

const formatPriceLevel = (priceLevel?: number): string => {
  if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
    return 'Not available';
  }

  if (priceLevel === 0) {
    return 'Free';
  }

  return '$'.repeat(priceLevel);
};

const isStudySpaceOpenNow = (studySpace: StudySpaceConfig, now: Date): boolean => {
  if (!studySpace.openDays.includes(now.getDay())) return false;
  const hour = now.getHours();
  return hour >= studySpace.openHour && hour < studySpace.closeHour;
};

const isWithinDistance = (currentCoords: Coordinates, targetCoords: Coordinates, thresholdMeters: number): boolean => {
  return getDistanceMeters(
    currentCoords.latitude,
    currentCoords.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  ) < thresholdMeters;
};

export const buildStudySpacePois = (currentCoords: Coordinates): POI[] => {
  return STUDY_SPACE_CONFIG
    .filter((space) => isStudySpaceOpenNow(space, new Date()))
    .flatMap((space) => {
      const coordinate = getBuildingCoordinate(space.code);
      if (!coordinate) return [];

      return [{
        id: space.id,
        name: space.name,
        address: space.address,
        isOpen: true,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        source: 'study' as const,
        pricing: 'Free',
        categoryLabel: POI_CATEGORIES.study.title,
        distance: getDistanceMeters(
          currentCoords.latitude,
          currentCoords.longitude,
          coordinate.latitude,
          coordinate.longitude
        ),
      }];
    })
    .sort((a, b) => a.distance - b.distance);
};

const buildPoiFromNearbyResult = (
  result: GooglePlacesNearbyResult,
  categoryKey: string,
  currentCoords: Coordinates
): POI | null => {
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;
  if (latitude == null || longitude == null) return null;

  return {
    id: result.place_id,
    name: result.name,
    address: result.vicinity ?? 'Address unavailable',
    isOpen: result.opening_hours?.open_now === true,
    rating: result.rating,
    latitude,
    longitude,
    source: 'google' as const,
    categoryLabel: POI_CATEGORIES[categoryKey as CategoryKey]?.title,
    distance: getDistanceMeters(
      currentCoords.latitude,
      currentCoords.longitude,
      latitude,
      longitude
    ),
  };
};

const fetchCategoryResult = async (
  categoryKey: string,
  googleType: string,
  currentCoords: Coordinates,
  apiKey: string
): Promise<CategoryFetchResult> => {
  try {
    const cachedEntry = await getCachedPOIs(categoryKey);
    if (
      cachedEntry &&
      isWithinDistance(currentCoords, {
        latitude: cachedEntry.latitude,
        longitude: cachedEntry.longitude,
      }, FETCH_MIN_DISTANCE_METERS)
    ) {
      return {
        categoryKey,
        pois: cachedEntry.pois,
      };
    }

    const params = new URLSearchParams({
      location: `${currentCoords.latitude},${currentCoords.longitude}`,
      radius: `${FETCH_RADIUS_METERS}`,
      type: googleType,
      opennow: 'true',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: GooglePlacesNearbyResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message ?? data.status);
    }

    const pois: POI[] = (data.results ?? [])
      .map((result) => buildPoiFromNearbyResult(result, categoryKey, currentCoords))
      .filter((poi): poi is POI => poi !== null)
      .sort((a, b) => a.distance - b.distance);

    await setCachedPOIs(categoryKey, pois, currentCoords.latitude, currentCoords.longitude);

    return {
      categoryKey,
      pois,
    };
  } catch (error) {
    return {
      categoryKey,
      error: error instanceof Error ? error.message : 'Failed to fetch nearby places',
    };
  }
};

const getMissingApiKeyResults = (): CategoryFetchResult[] => ([
  { categoryKey: 'coffee', error: 'Missing Google Maps API key' },
  { categoryKey: 'restaurant', error: 'Missing Google Maps API key' },
  { categoryKey: 'grocery', error: 'Missing Google Maps API key' },
]);

export const fetchGoogleCategoryResults = async (
  apiKey: string,
  currentCoords: Coordinates
): Promise<CategoryFetchResult[]> => {
  if (apiKey) {
    const entries = Object.entries(CATEGORY_TO_GOOGLE_TYPE);
    return Promise.all(
      entries.map(([categoryKey, googleType]) => {
        return fetchCategoryResult(categoryKey, googleType, currentCoords, apiKey);
      })
    );
  }

  return getMissingApiKeyResults();
};

export const applyFetchedResults = (
  prev: Record<string, POICategory>,
  studySpaces: POI[],
  categoryResults: CategoryFetchResult[]
): Record<string, POICategory> => {
  const next = { ...prev };

  next.study = {
    ...next.study,
    isLoading: false,
    error: undefined,
    pois: studySpaces,
  };

  categoryResults.forEach((result) => {
    if ('error' in result) {
      next[result.categoryKey] = {
        ...next[result.categoryKey],
        isLoading: false,
        error: result.error,
        pois: [],
      };
      return;
    }

    next[result.categoryKey] = {
      ...next[result.categoryKey],
      isLoading: false,
      error: undefined,
      pois: result.pois,
    };
  });

  return next;
};

const fetchGooglePlaceDetails = async (poi: POI, apiKey: string): Promise<GooglePlaceDetailsResponse> => {
  const params = new URLSearchParams({
    place_id: poi.id,
    fields: [
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'price_level',
      'photos',
      'website',
    ].join(','),
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );

  const data: GooglePlaceDetailsResponse = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (data.status !== 'OK') {
    throw new Error(data.error_message ?? data.status);
  }

  return data;
};

const buildDetailedPoi = (poi: POI, details: GooglePlaceDetailsResponse, apiKey: string): POI => {
  const photoReference = details.result?.photos?.[0]?.photo_reference;
  const photoUrl = photoReference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`
    : undefined;

  return {
    ...poi,
    address: details.result?.formatted_address ?? poi.address,
    phoneNumber: details.result?.formatted_phone_number ?? details.result?.international_phone_number,
    pricing: formatPriceLevel(details.result?.price_level),
    website: details.result?.website,
    photoUrl,
  };
};

export const resolvePoiDetails = async (
  poi: POI,
  apiKey: string
): Promise<{ details: POI | null; error: string | null }> => {
  if (poi.source !== 'google') {
    return {
      details: {
        ...poi,
        pricing: poi.pricing ?? 'Free',
      },
      error: null,
    };
  }

  if (!apiKey) {
    return {
      details: null,
      error: 'Missing Google Maps API key',
    };
  }

  try {
    const details = await fetchGooglePlaceDetails(poi, apiKey);
    return {
      details: buildDetailedPoi(poi, details, apiKey),
      error: null,
    };
  } catch (error) {
    return {
      details: null,
      error: error instanceof Error ? error.message : 'Unable to load POI details',
    };
  }
};
