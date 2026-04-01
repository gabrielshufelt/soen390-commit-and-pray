import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import BuildingModal from '../../components/buildingModal';
import type { BuildingData } from '../../components/buildingModal';
import { useTheme } from '../../context/ThemeContext';
import { useWatchLocation } from '../../hooks/useWatchLocation';
import { getDistanceMeters } from '../../utils/geometry';
import { getBuildingCoordinate } from '../../utils/buildingCoordinates';
import { styles } from '@/styles/nearby.styles';
import {
  CATEGORY_KEYS,
  CATEGORY_TO_GOOGLE_TYPE,
  CACHE_EXPIRATION_MS,
  CACHE_KEY_PREFIX,
  DEFAULT_RADIUS_KM,
  FETCH_DEBOUNCE_MS,
  FETCH_MIN_DISTANCE_METERS,
  FETCH_RADIUS_METERS,
  MAX_POIS_PER_CATEGORY,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  POI_CATEGORIES,
  SEE_ALL_PAGE_SIZE,
  STUDY_SPACE_CONFIG,
} from '@/constants/poi.types';
import type {
  CacheEntry,
  CategoryFetchResult,
  CategoryKey,
  Coordinates,
  GooglePlaceDetailsResponse,
  GooglePlacesNearbyResponse,
  GooglePlacesNearbyResult,
  POI,
  POICategory,
  StudySpaceConfig,
} from '@/constants/poi.types';

const isStudySpaceOpenNow = (studySpace: StudySpaceConfig, now: Date): boolean => {
  if (!studySpace.openDays.includes(now.getDay())) return false;
  const hour = now.getHours();
  return hour >= studySpace.openHour && hour < studySpace.closeHour;
};

const formatPriceLevel = (priceLevel?: number): string => {
  if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
    return 'Not available';
  }

  if (priceLevel === 0) {
    return 'Free';
  }

  return '$'.repeat(priceLevel);
};

const getCacheKey = (categoryKey: string): string => `${CACHE_KEY_PREFIX}${categoryKey}`;

const getCachedPOIs = async (categoryKey: string): Promise<CacheEntry | null> => {
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(categoryKey));
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - entry.timestamp > CACHE_EXPIRATION_MS) {
      await AsyncStorage.removeItem(getCacheKey(categoryKey));
      return null;
    }

    return entry;
  } catch (error) {
    console.warn(`Failed to read cache for ${categoryKey}:`, error);
    return null;
  }
};

const setCachedPOIs = async (categoryKey: string, pois: POI[], latitude: number, longitude: number): Promise<void> => {
  try {
    const entry: CacheEntry = {
      pois,
      timestamp: Date.now(),
      latitude,
      longitude,
    };
    await AsyncStorage.setItem(getCacheKey(categoryKey), JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to cache POIs for ${categoryKey}:`, error);
  }
};

const clearCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

const createInitialCategories = (): Record<string, POICategory> => ({
  study: { title: POI_CATEGORIES.study.title, icon: POI_CATEGORIES.study.icon, pois: [], isLoading: true },
  coffee: { title: POI_CATEGORIES.coffee.title, icon: POI_CATEGORIES.coffee.icon, pois: [], isLoading: true },
  restaurant: { title: POI_CATEGORIES.restaurant.title, icon: POI_CATEGORIES.restaurant.icon, pois: [], isLoading: true },
  grocery: { title: POI_CATEGORIES.grocery.title, icon: POI_CATEGORIES.grocery.icon, pois: [], isLoading: true },
});

const markLocationPermissionError = (prev: Record<string, POICategory>): Record<string, POICategory> => {
  const next = { ...prev };
  CATEGORY_KEYS.forEach((key) => {
    next[key] = {
      ...next[key],
      isLoading: false,
      error: 'Location permission required',
    };
  });
  return next;
};

const markAllCategoriesLoading = (prev: Record<string, POICategory>): Record<string, POICategory> => {
  const next = { ...prev };
  CATEGORY_KEYS.forEach((key) => {
    next[key] = {
      ...next[key],
      isLoading: true,
      error: undefined,
    };
  });
  return next;
};

const isWithinDistance = (currentCoords: Coordinates, targetCoords: Coordinates, thresholdMeters: number): boolean => {
  return getDistanceMeters(
    currentCoords.latitude,
    currentCoords.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  ) < thresholdMeters;
};

const shouldSkipAutoFetch = (
  isManualRefresh: boolean,
  now: number,
  lastFetchTime: number,
  lastFetchCoords: Coordinates | null,
  currentCoords: Coordinates
): boolean => {
  if (isManualRefresh) return false;
  if (now - lastFetchTime < FETCH_DEBOUNCE_MS) return true;
  if (!lastFetchCoords) return false;
  return isWithinDistance(currentCoords, lastFetchCoords, FETCH_MIN_DISTANCE_METERS);
};

const buildStudySpacePois = (currentCoords: Coordinates): POI[] => {
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
  const latitude = result.geometry?.location?.lat ?? 0;
  const longitude = result.geometry?.location?.lng ?? 0;
  if (latitude === 0 || longitude === 0) return null;

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
      .filter((result) => result.opening_hours?.open_now === true)
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

const fetchGoogleCategoryResults = async (
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

const applyFetchedResults = (
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

const getFilterActionBackgroundColor = (hasActiveFilters: boolean, isDark: boolean): string => {
  if (!hasActiveFilters) return 'transparent';
  return isDark ? '#3a2a2f' : '#fdecef';
};

const formatDistance = (distance: number): string => {
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
};

const mapBuildingDataToPoi = (buildingData: BuildingData, selectedPoiDetails: POI | null): POI | null => {
  const coords = buildingData?.geometry?.coordinates?.[0]?.[0];
  if (!coords) return null;

  const [longitude, latitude] = coords;
  return {
    id: buildingData.id,
    name: buildingData.properties?.name ?? 'POI',
    address: buildingData.properties?.address ?? 'Address unavailable',
    distance: selectedPoiDetails?.distance ?? 0,
    isOpen: buildingData.properties?.isOpen ?? true,
    rating: buildingData.properties?.rating,
    latitude,
    longitude,
    source: selectedPoiDetails?.source ?? 'google',
    categoryLabel: buildingData.properties?.categoryLabel,
    phoneNumber: buildingData.properties?.phoneNumber,
    pricing: buildingData.properties?.pricing,
    photoUrl: buildingData.properties?.photoUrl,
    website: buildingData.properties?.website,
  };
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

const resolvePoiDetails = async (
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

function SeeAllCategoryView({
  category,
  visiblePois,
  hasMoreSeeAllItems,
  isDark,
  textColor,
  bgColor,
  secondaryBgColor,
  borderColor,
  onBack,
  onOpenPoiDetails,
  onGetDirections,
  onLoadMore,
  onScrollBegin,
}: Readonly<{
  category: POICategory;
  visiblePois: POI[];
  hasMoreSeeAllItems: boolean;
  isDark: boolean;
  textColor: string;
  bgColor: string;
  secondaryBgColor: string;
  borderColor: string;
  onBack: () => void;
  onOpenPoiDetails: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  onLoadMore: () => void;
  onScrollBegin: () => void;
}>) {
  return (
    <View style={[styles.fullPageContainer, { backgroundColor: bgColor }]}> 
      <View style={[styles.fullPageHeader, { borderBottomColor: borderColor }]}> 
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to nearby"
        >
          <FontAwesome name="chevron-left" size={16} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.fullPageTitle, { color: textColor }]}>{category.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={visiblePois}
        keyExtractor={(poi) => poi.id}
        contentContainerStyle={styles.fullPageList}
        onMomentumScrollBegin={onScrollBegin}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item: poi }) => (
          <POICard
            poi={poi}
            onPress={onOpenPoiDetails}
            onGetDirections={onGetDirections}
            isDark={isDark}
            secondaryBgColor={secondaryBgColor}
            borderColor={borderColor}
            variant="vertical"
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: secondaryBgColor }]}> 
            <FontAwesome name="search" size={24} color={isDark ? '#8e8e93' : '#6e6e73'} />
            <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
              No {category.title.toLowerCase()} found nearby
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMoreSeeAllItems ? (
            <Text style={[styles.loadMoreHint, { color: isDark ? '#8e8e93' : '#6e6e73' }]}> 
              Scroll to load more
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function NearbyMainContent({
  categories,
  previewCategories,
  filteredCategories,
  selectedCategories,
  selectedRadiusKm,
  radiusInputKm,
  showFilterModal,
  filterActionBackgroundColor,
  selectedPoi,
  selectedPoiAsBuildingData,
  isDark,
  textColor,
  bgColor,
  secondaryBgColor,
  borderColor,
  onRefresh,
  onOpenPoiDetails,
  onGetDirections,
  onSeeAll,
  onOpenFilterModal,
  onCloseFilterModal,
  onToggleCategoryFilter,
  onClearAllFilters,
  onRadiusInputChange,
  onRadiusInputBlur,
  onRadiusSliderChange,
  onClosePoiDetailsModal,
  onPoiModalDirections,
}: Readonly<{
  categories: Record<string, POICategory>;
  previewCategories: readonly (readonly [CategoryKey, POICategory])[];
  filteredCategories: readonly (readonly [CategoryKey, POICategory])[];
  selectedCategories: Record<CategoryKey, boolean>;
  selectedRadiusKm: number;
  radiusInputKm: string;
  showFilterModal: boolean;
  filterActionBackgroundColor: string;
  selectedPoi: POI | null;
  selectedPoiAsBuildingData: BuildingData | null;
  isDark: boolean;
  textColor: string;
  bgColor: string;
  secondaryBgColor: string;
  borderColor: string;
  onRefresh: () => void;
  onOpenPoiDetails: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  onSeeAll: (categoryKey: CategoryKey) => void;
  onOpenFilterModal: () => void;
  onCloseFilterModal: () => void;
  onToggleCategoryFilter: (categoryKey: CategoryKey) => void;
  onClearAllFilters: () => void;
  onRadiusInputChange: (value: string) => void;
  onRadiusInputBlur: () => void;
  onRadiusSliderChange: (value: number) => void;
  onClosePoiDetailsModal: () => void;
  onPoiModalDirections: (buildingData: BuildingData) => void;
}>) {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={Object.values(categories).some((category) => category.isLoading)}
          onRefresh={onRefresh}
          tintColor={isDark ? '#0a84ff' : '#007aff'}
        />
      }
    >

      <TouchableOpacity
        style={[
          styles.searchBar,
          {
            backgroundColor: secondaryBgColor,
            borderColor: borderColor,
          }
        ]}
        disabled
      >
        <FontAwesome name="search" size={16} color={isDark ? '#8e8e93' : '#6e6e73'} />
        <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginLeft: 8 }}>
          Search POIs
        </Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, { borderColor }]} onPress={onRefresh}>
          <FontAwesome name="refresh" size={14} color="#a94a5c" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.filterActionButton,
            { borderColor, backgroundColor: filterActionBackgroundColor },
          ]}
          onPress={onOpenFilterModal}
        >
          <FontAwesome name="sliders" size={14} color="#a94a5c" />
          <Text style={styles.actionButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {previewCategories.map(([key, category]) => {
        const totalCategoryCount = filteredCategories.find(([categoryKey]) => categoryKey === key)?.[1].pois.length ?? 0;

        return (
          <POICategorySection
            key={key}
            categoryKey={key}
            category={category}
            onPressPoi={onOpenPoiDetails}
            onGetDirections={onGetDirections}
            onSeeAll={onSeeAll}
            totalCount={totalCategoryCount}
            isDark={isDark}
            textColor={textColor}
            secondaryBgColor={secondaryBgColor}
            borderColor={borderColor}
          />
        );
      })}

      {filteredCategories.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: secondaryBgColor }]}> 
          <FontAwesome name="filter" size={24} color={isDark ? '#8e8e93' : '#6e6e73'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            No categories selected in filter
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      <BuildingModal
        visible={selectedPoi !== null}
        mode="poi"
        building={selectedPoiAsBuildingData}
        onClose={onClosePoiDetailsModal}
        onGetDirections={onPoiModalDirections}
      />

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={onCloseFilterModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModal, { backgroundColor: bgColor, borderColor }]}> 
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: textColor }]}>Filter POIs</Text>
              <TouchableOpacity onPress={onCloseFilterModal}>
                <FontAwesome name="times" size={20} color={isDark ? '#8e8e93' : '#6e6e73'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionLabel, { color: textColor }]}>Category</Text>
            <View style={styles.filterChipWrap}>
              {(Object.keys(POI_CATEGORIES) as CategoryKey[]).map((categoryKey) => {
                const isSelected = selectedCategories[categoryKey];
                return (
                  <TouchableOpacity
                    key={categoryKey}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected ? '#a94a5c' : secondaryBgColor,
                      },
                    ]}
                    onPress={() => onToggleCategoryFilter(categoryKey)}
                  >
                    <Text style={{ color: isSelected ? '#ffffff' : textColor, fontWeight: '600' }}>
                      {POI_CATEGORIES[categoryKey].title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.filterSectionLabel, { color: textColor }]}>Destination Radius</Text>
            <View style={styles.radiusInlineRow}>
              <View style={styles.radiusSliderWrap}>
                <Slider
                  minimumValue={MIN_RADIUS_KM}
                  maximumValue={MAX_RADIUS_KM}
                  step={0.5}
                  value={selectedRadiusKm}
                  onValueChange={onRadiusSliderChange}
                  minimumTrackTintColor="#a94a5c"
                  maximumTrackTintColor={isDark ? '#3f3f44' : '#d7d7db'}
                  thumbTintColor="#a94a5c"
                />
              </View>
              <TextInput
                value={radiusInputKm}
                onChangeText={onRadiusInputChange}
                onBlur={onRadiusInputBlur}
                onSubmitEditing={onRadiusInputBlur}
                keyboardType="decimal-pad"
                style={[styles.radiusInlineInput, { color: textColor }]}
              />
              <Text style={[styles.radiusInlineUnit, { color: textColor }]}>km</Text>
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity style={[styles.clearButton, { borderColor }]} onPress={onClearAllFilters}>
                <Text style={{ color: '#a94a5c', fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={onCloseFilterModal}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function NearbyScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { location } = useWatchLocation();
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';
  const router = useRouter();

  const [categories, setCategories] = useState<Record<string, POICategory>>(createInitialCategories);

  const lastFetchTimeRef = useRef<number>(0);
  const lastFetchCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);
  const lastHandledManualRefreshRef = useRef(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<CategoryKey, boolean>>({
    study: true,
    coffee: true,
    restaurant: true,
    grocery: true,
  });
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [radiusInputKm, setRadiusInputKm] = useState(DEFAULT_RADIUS_KM.toFixed(1));
  const [selectedSeeAllCategory, setSelectedSeeAllCategory] = useState<CategoryKey | null>(null);
  const [seeAllVisibleCount, setSeeAllVisibleCount] = useState(SEE_ALL_PAGE_SIZE);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [selectedPoiDetails, setSelectedPoiDetails] = useState<POI | null>(null);
  const [isPoiDetailsLoading, setIsPoiDetailsLoading] = useState(false);
  const [poiDetailsError, setPoiDetailsError] = useState<string | null>(null);
  const canLoadMoreRef = useRef(true);

  const handleRefresh = () => {
    // Clear cache on manual refresh
    clearCache();
    setManualRefreshTrigger((prev) => prev + 1);
  };

  const handleGetDirections = (poi: POI) => {
    router.push({
      pathname: '/',
      params: {
        nearbyLat: String(poi.latitude),
        nearbyLng: String(poi.longitude),
        nearbyName: poi.name,
        nearbyNonce: String(Date.now()),
      },
    });
  };

  const closePoiDetailsModal = () => {
    setSelectedPoi(null);
    setSelectedPoiDetails(null);
    setPoiDetailsError(null);
    setIsPoiDetailsLoading(false);
  };

  const handleOpenPoiDetails = async (poi: POI) => {
    setSelectedPoi(poi);
    setSelectedPoiDetails(poi);
    setPoiDetailsError(null);
    setIsPoiDetailsLoading(false);

    const needsGoogleDetails = poi.source === 'google';
    if (needsGoogleDetails) {
      setIsPoiDetailsLoading(true);
    }

    const { details, error } = await resolvePoiDetails(poi, apiKey);

    if (details) {
      setSelectedPoiDetails(details);
    }
    if (error) {
      setPoiDetailsError(error);
    }

    if (needsGoogleDetails) {
      setIsPoiDetailsLoading(false);
    }
  };

  const toggleCategoryFilter = (categoryKey: CategoryKey) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const clearAllFilters = () => {
    setSelectedCategories({
      study: true,
      coffee: true,
      restaurant: true,
      grocery: true,
    });
    setSelectedRadiusKm(DEFAULT_RADIUS_KM);
    setRadiusInputKm(DEFAULT_RADIUS_KM.toFixed(1));
  };

  const handleSeeAll = (categoryKey: CategoryKey) => {
    setSelectedSeeAllCategory(categoryKey);
    setSeeAllVisibleCount(SEE_ALL_PAGE_SIZE);
    canLoadMoreRef.current = true;
  };

  const handleRadiusInputBlur = () => {
    const parsed = Number.parseFloat(radiusInputKm);
    if (!Number.isFinite(parsed)) {
      setRadiusInputKm(selectedRadiusKm.toFixed(1));
      return;
    }

    const clamped = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, parsed));
    setSelectedRadiusKm(clamped);
    setRadiusInputKm(clamped.toFixed(1));
  };

  const handleRadiusInputChange = (value: string) => {
    setRadiusInputKm(value);
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, parsed));
    setSelectedRadiusKm(clamped);
  };

  useEffect(() => {
    const isManualRefresh = manualRefreshTrigger !== lastHandledManualRefreshRef.current;

    if (!location) {
      setCategories(markLocationPermissionError);
      return;
    }

    const currentCoords: Coordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const now = Date.now();
    if (
      shouldSkipAutoFetch(
        isManualRefresh,
        now,
        lastFetchTimeRef.current,
        lastFetchCoordsRef.current,
        currentCoords
      )
    ) {
      return;
    }

    let cancelled = false;

    const fetchNearbyPlaces = async () => {
      setCategories(markAllCategoriesLoading);

      const studySpaces = buildStudySpacePois(currentCoords);
      const categoryResults = await fetchGoogleCategoryResults(apiKey, currentCoords);
      if (cancelled) return;

      setCategories((prev) => applyFetchedResults(prev, studySpaces, categoryResults));

      lastFetchTimeRef.current = now;
      lastFetchCoordsRef.current = currentCoords;
      lastHandledManualRefreshRef.current = manualRefreshTrigger;
    };

    fetchNearbyPlaces();

    return () => {
      cancelled = true;
    };
  }, [location, apiKey, manualRefreshTrigger]);

  const textColor = isDark ? '#ffffff' : '#000000';
  const bgColor = isDark ? '#1c1c1e' : '#ffffff';
  const secondaryBgColor = isDark ? '#2c2c2e' : '#f2f2f7';
  const borderColor = isDark ? '#38383a' : '#e5e5ea';
  const selectedCategoryCount = Object.values(selectedCategories).filter(Boolean).length;
  const hasActiveFilters = selectedCategoryCount < Object.keys(POI_CATEGORIES).length || selectedRadiusKm !== DEFAULT_RADIUS_KM;
  const filterActionBackgroundColor = getFilterActionBackgroundColor(hasActiveFilters, isDark);

  const handlePoiModalDirections = (buildingData: BuildingData) => {
    const poi = mapBuildingDataToPoi(buildingData, selectedPoiDetails);
    if (!poi) return;
    handleGetDirections(poi);
  };

  const filteredCategories = useMemo(() => {
    return (Object.entries(categories) as [CategoryKey, POICategory][])
      .filter(([categoryKey]) => selectedCategories[categoryKey])
      .map(([categoryKey, category]) => {
        const radiusMeters = selectedRadiusKm * 1000;
        const radiusFilteredPois = category.pois.filter((poi) => poi.distance <= radiusMeters);

        return [categoryKey, { ...category, pois: radiusFilteredPois }] as const;
      });
  }, [categories, selectedCategories, selectedRadiusKm]);

  const previewCategories = useMemo(() => {
    return filteredCategories.map(([categoryKey, category]) => (
      [categoryKey, { ...category, pois: category.pois.slice(0, MAX_POIS_PER_CATEGORY) }] as const
    ));
  }, [filteredCategories]);

  const selectedCategoryEntry = useMemo(() => {
    if (!selectedSeeAllCategory) return null;
    return filteredCategories.find(([categoryKey]) => categoryKey === selectedSeeAllCategory) ?? null;
  }, [selectedSeeAllCategory, filteredCategories]);

  const selectedPoiAsBuildingData = useMemo<BuildingData | null>(() => {
    if (!selectedPoiDetails) return null;

    return {
      id: selectedPoiDetails.id,
      geometry: {
        type: 'Point',
        coordinates: [[[selectedPoiDetails.longitude, selectedPoiDetails.latitude]]],
      },
      properties: {
        name: selectedPoiDetails.name,
        address: selectedPoiDetails.address,
        categoryLabel: selectedPoiDetails.categoryLabel,
        photoUrl: selectedPoiDetails.photoUrl,
        phoneNumber: selectedPoiDetails.phoneNumber,
        pricing: selectedPoiDetails.pricing,
        website: selectedPoiDetails.website,
        rating: selectedPoiDetails.rating,
        isOpen: selectedPoiDetails.isOpen,
        detailsLoading: isPoiDetailsLoading,
        detailsError: poiDetailsError ?? undefined,
      },
    };
  }, [selectedPoiDetails, isPoiDetailsLoading, poiDetailsError]);

  const handleSeeAllLoadMore = (categoryPoisLength: number) => {
    if (!canLoadMoreRef.current) return;
    canLoadMoreRef.current = false;
    setSeeAllVisibleCount((prev) => Math.min(prev + SEE_ALL_PAGE_SIZE, categoryPoisLength));
  };

  if (selectedCategoryEntry) {
    const [, category] = selectedCategoryEntry;
    const visiblePois = category.pois.slice(0, seeAllVisibleCount);
    const hasMoreSeeAllItems = seeAllVisibleCount < category.pois.length;

    return (
      <SeeAllCategoryView
        category={category}
        visiblePois={visiblePois}
        hasMoreSeeAllItems={hasMoreSeeAllItems}
        isDark={isDark}
        textColor={textColor}
        bgColor={bgColor}
        secondaryBgColor={secondaryBgColor}
        borderColor={borderColor}
        onBack={() => setSelectedSeeAllCategory(null)}
        onOpenPoiDetails={handleOpenPoiDetails}
        onGetDirections={handleGetDirections}
        onLoadMore={() => {
          if (!hasMoreSeeAllItems) return;
          handleSeeAllLoadMore(category.pois.length);
        }}
        onScrollBegin={() => {
          canLoadMoreRef.current = true;
        }}
      />
    );
  }

  return (
    <NearbyMainContent
      categories={categories}
      previewCategories={previewCategories}
      filteredCategories={filteredCategories}
      selectedCategories={selectedCategories}
      selectedRadiusKm={selectedRadiusKm}
      radiusInputKm={radiusInputKm}
      showFilterModal={showFilterModal}
      filterActionBackgroundColor={filterActionBackgroundColor}
      selectedPoi={selectedPoi}
      selectedPoiAsBuildingData={selectedPoiAsBuildingData}
      isDark={isDark}
      textColor={textColor}
      bgColor={bgColor}
      secondaryBgColor={secondaryBgColor}
      borderColor={borderColor}
      onRefresh={handleRefresh}
      onOpenPoiDetails={handleOpenPoiDetails}
      onGetDirections={handleGetDirections}
      onSeeAll={handleSeeAll}
      onOpenFilterModal={() => setShowFilterModal(true)}
      onCloseFilterModal={() => setShowFilterModal(false)}
      onToggleCategoryFilter={toggleCategoryFilter}
      onClearAllFilters={clearAllFilters}
      onRadiusInputChange={handleRadiusInputChange}
      onRadiusInputBlur={handleRadiusInputBlur}
      onRadiusSliderChange={(value) => {
        setSelectedRadiusKm(value);
        setRadiusInputKm(value.toFixed(1));
      }}
      onClosePoiDetailsModal={closePoiDetailsModal}
      onPoiModalDirections={handlePoiModalDirections}
    />
  );
}

function POICategorySection({ 
  categoryKey,
  category, 
  onPressPoi,
  onGetDirections,
  onSeeAll,
  totalCount,
  isDark, 
  textColor, 
  secondaryBgColor, 
  borderColor 
}: Readonly<{
  categoryKey: CategoryKey;
  category: POICategory;
  onPressPoi: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  onSeeAll: (categoryKey: CategoryKey) => void;
  totalCount: number;
  isDark: boolean;
  textColor: string;
  secondaryBgColor: string;
  borderColor: string;
}>) {
  return (
    <View style={styles.categorySection}>
      {/* Category Header */}
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitle}>
          <FontAwesome 
            name={category.icon as any} 
            size={20} 
            color={isDark ? '#8e8e93' : '#6e6e73'} 
          />
          <Text style={[styles.categoryName, { color: textColor, marginLeft: 10 }]}>
            {category.title}
          </Text>
        </View>
        {!category.isLoading && totalCount > MAX_POIS_PER_CATEGORY && (
          <TouchableOpacity onPress={() => onSeeAll(categoryKey)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading State */}
      {category.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={isDark ? '#0a84ff' : '#007aff'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            Loading {category.title.toLowerCase()}...
          </Text>
        </View>
      )}

      {/* Error State */}
      {category.error && !category.isLoading && (
        <View style={[styles.emptyState, { backgroundColor: secondaryBgColor }]}>
          <FontAwesome name="exclamation-circle" size={24} color={isDark ? '#8e8e93' : '#6e6e73'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            {category.error}
          </Text>
        </View>
      )}

      {/* POI List */}
      {!category.isLoading && category.pois.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.poiScrollContent}
          style={styles.poiScroll}
          data={category.pois}
          keyExtractor={(poi) => poi.id}
          renderItem={({ item: poi }) => (
            <POICard
              poi={poi}
              onPress={onPressPoi}
              onGetDirections={onGetDirections}
              isDark={isDark}
              secondaryBgColor={secondaryBgColor}
              borderColor={borderColor}
            />
          )}
        />
      )}

      {/* Empty State */}
      {!category.isLoading && category.pois.length === 0 && !category.error && (
        <View style={[styles.emptyState, { backgroundColor: secondaryBgColor }]}>
          <FontAwesome name="search" size={24} color={isDark ? '#8e8e93' : '#6e6e73'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            No {category.title.toLowerCase()} found nearby
          </Text>
        </View>
      )}
    </View>
  );
}

function POICard({ 
  poi, 
  onPress,
  onGetDirections,
  isDark, 
  secondaryBgColor,
  borderColor,
  variant = 'horizontal',
}: Readonly<{
  poi: POI;
  onPress: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  isDark: boolean;
  secondaryBgColor: string;
  borderColor: string;
  variant?: 'horizontal' | 'vertical';
}>) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#8e8e93' : '#6e6e73';

  return (
    <TouchableOpacity 
      style={[
        styles.poiCard, 
        variant === 'vertical' ? styles.poiCardVertical : undefined,
        { 
          backgroundColor: secondaryBgColor,
          borderColor: borderColor,
        }
      ]}
      onPress={() => onPress(poi)}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${poi.name}`}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.poiName, { color: textColor }]} numberOfLines={2}>
            {poi.name}
          </Text>
          <Text style={[styles.poiAddress, { color: mutedColor }]} numberOfLines={1}>
            {poi.address}
          </Text>
        </View>
      </View>

      {/* Distance & Status */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.distance, { color: '#a94a5c' }]}>
            {formatDistance(poi.distance)}
          </Text>
          <Text style={[styles.status, { color: poi.isOpen ? '#34C759' : '#FF3B30' }]}>
            {poi.isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Get Directions Button */}
      <TouchableOpacity 
        style={styles.directionsButton}
        onPress={() => onGetDirections(poi)}
      >
        <FontAwesome name="location-arrow" size={14} color="#ffffff" />
        <Text style={styles.directionsText}>Get Directions</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}