import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Modal, TextInput, FlatList } from 'react-native';
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

interface POI {
  id: string;
  name: string;
  address: string;
  distance: number;
  isOpen: boolean;
  rating?: number;
  latitude: number;
  longitude: number;
  source: 'study' | 'google';
  categoryLabel?: string;
  phoneNumber?: string;
  pricing?: string;
  photoUrl?: string;
  website?: string;
}

interface POICategory {
  title: string;
  icon: string;
  pois: POI[];
  isLoading: boolean;
  error?: string;
}

const POI_CATEGORIES = {
  study: { title: 'Study Spaces', icon: 'book', color: '#4B5563' },
  coffee: { title: 'Coffee Shops', icon: 'coffee', color: '#8B4513' },
  restaurant: { title: 'Restaurants', icon: 'cutlery', color: '#D2691E' },
  grocery: { title: 'Grocery Stores', icon: 'shopping-cart', color: '#228B22' },
};

const CATEGORY_TO_GOOGLE_TYPE: Record<string, string> = {
  coffee: 'cafe',
  restaurant: 'restaurant',
  grocery: 'supermarket',
};

const FETCH_DEBOUNCE_MS = 2000;
const FETCH_MIN_DISTANCE_METERS = 150;
const FETCH_RADIUS_METERS = 2000;
const MAX_POIS_PER_CATEGORY = 5;
const SEE_ALL_PAGE_SIZE = 10;
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY_PREFIX = 'nearby_pois_';

interface CacheEntry {
  pois: POI[];
  timestamp: number;
  latitude: number;
  longitude: number;
}

type CategoryKey = keyof typeof POI_CATEGORIES;
const DEFAULT_RADIUS_KM = 2;
const MIN_RADIUS_KM = 0.5;
const MAX_RADIUS_KM = 10;

interface StudySpaceConfig {
  id: string;
  code: string;
  name: string;
  address: string;
  openHour: number;
  closeHour: number;
  openDays: number[];
}

const STUDY_SPACE_CONFIG: StudySpaceConfig[] = [
  {
    id: 'study-lb',
    code: 'LB',
    name: 'J. W. McConnell Library Building',
    address: '1400 De Maisonneuve Blvd W',
    openHour: 8,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-vl',
    code: 'VL',
    name: 'Vanier Library',
    address: '7141 Sherbrooke St W',
    openHour: 8,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-h',
    code: 'H',
    name: 'Hall Building Study Areas',
    address: '1455 De Maisonneuve Blvd W',
    openHour: 7,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-sp',
    code: 'SP',
    name: 'Science Complex Study Areas',
    address: '7141 Sherbrooke St W',
    openHour: 7,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5],
  },
  {
    id: 'study-mb',
    code: 'MB',
    name: 'John Molson Study Areas',
    address: '1450 Guy St',
    openHour: 7,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5],
  },
  {
    id: 'study-cc',
    code: 'CC',
    name: 'Central Building Study Areas',
    address: '7141 Sherbrooke St W',
    openHour: 8,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5, 6],
  },
];

interface GooglePlacesNearbyResult {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
}

interface GooglePlacesNearbyResponse {
  status: string;
  results?: GooglePlacesNearbyResult[];
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  error_message?: string;
  result?: {
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    price_level?: number;
    website?: string;
    photos?: Array<{
      photo_reference?: string;
    }>;
  };
}

type CategoryFetchResult =
  | { categoryKey: string; pois: POI[] }
  | { categoryKey: string; error: string };

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

export default function NearbyScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { location } = useWatchLocation();
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';
  const router = useRouter();

  const [categories, setCategories] = useState<Record<string, POICategory>>({
    study: { title: POI_CATEGORIES.study.title, icon: POI_CATEGORIES.study.icon, pois: [], isLoading: true },
    coffee: { title: POI_CATEGORIES.coffee.title, icon: POI_CATEGORIES.coffee.icon, pois: [], isLoading: true },
    restaurant: { title: POI_CATEGORIES.restaurant.title, icon: POI_CATEGORIES.restaurant.icon, pois: [], isLoading: true },
    grocery: { title: POI_CATEGORIES.grocery.title, icon: POI_CATEGORIES.grocery.icon, pois: [], isLoading: true },
  });

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

    if (poi.source !== 'google') {
      setSelectedPoiDetails({
        ...poi,
        pricing: poi.pricing ?? 'Free',
      });
      return;
    }

    if (!apiKey) {
      setPoiDetailsError('Missing Google Maps API key');
      return;
    }

    setIsPoiDetailsLoading(true);

    try {
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

      const photoReference = data.result?.photos?.[0]?.photo_reference;
      const photoUrl = photoReference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`
        : undefined;

      setSelectedPoiDetails({
        ...poi,
        address: data.result?.formatted_address ?? poi.address,
        phoneNumber: data.result?.formatted_phone_number ?? data.result?.international_phone_number,
        pricing: formatPriceLevel(data.result?.price_level),
        website: data.result?.website,
        photoUrl,
      });
    } catch (error) {
      setPoiDetailsError(error instanceof Error ? error.message : 'Unable to load POI details');
    } finally {
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
      setCategories((prev) => ({
        ...prev,
        study: { ...prev.study, isLoading: false, error: 'Location permission required' },
        coffee: { ...prev.coffee, isLoading: false, error: 'Location permission required' },
        restaurant: { ...prev.restaurant, isLoading: false, error: 'Location permission required' },
        grocery: { ...prev.grocery, isLoading: false, error: 'Location permission required' },
      }));
      return;
    }

    const currentCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const now = Date.now();
    if (!isManualRefresh && now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) return;

    // Only fetch again when the user moved enough from the last successful fetch point.
    if (
      !isManualRefresh &&
      lastFetchCoordsRef.current &&
      getDistanceMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        lastFetchCoordsRef.current.latitude,
        lastFetchCoordsRef.current.longitude
      ) < FETCH_MIN_DISTANCE_METERS
    ) {
      return;
    }

    let cancelled = false;

    const fetchNearbyPlaces = async () => {
      setCategories((prev) => ({
        ...prev,
        study: { ...prev.study, isLoading: true, error: undefined },
        coffee: { ...prev.coffee, isLoading: true, error: undefined },
        restaurant: { ...prev.restaurant, isLoading: true, error: undefined },
        grocery: { ...prev.grocery, isLoading: true, error: undefined },
      }));

      const studySpaces: POI[] = STUDY_SPACE_CONFIG
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

      let categoryResults: CategoryFetchResult[] = [];

      if (!apiKey) {
        categoryResults = [
          { categoryKey: 'coffee', error: 'Missing Google Maps API key' },
          { categoryKey: 'restaurant', error: 'Missing Google Maps API key' },
          { categoryKey: 'grocery', error: 'Missing Google Maps API key' },
        ];
      } else {
        const entries = Object.entries(CATEGORY_TO_GOOGLE_TYPE);

        categoryResults = await Promise.all(
          entries.map(async ([categoryKey, googleType]) => {
            try {
              // Check cache first
              const cachedEntry = await getCachedPOIs(categoryKey);
              
              // Verify cache is valid if it exists (same location or close enough)
              if (
                cachedEntry &&
                getDistanceMeters(
                  currentCoords.latitude,
                  currentCoords.longitude,
                  cachedEntry.latitude,
                  cachedEntry.longitude
                ) < FETCH_MIN_DISTANCE_METERS
              ) {
                // Cache is valid, use it
                return {
                  categoryKey,
                  pois: cachedEntry.pois,
                };
              }

              // Cache miss or location changed significantly, fetch from API
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
              const data: GooglePlacesNearbyResponse = await response.json();

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(data.error_message ?? data.status);
              }

              const pois: POI[] = (data.results ?? [])
                .filter((result) => result.opening_hours?.open_now === true)
                .map((result) => {
                  const poiCoords = {
                    latitude: result.geometry?.location?.lat ?? 0,
                    longitude: result.geometry?.location?.lng ?? 0,
                  };

                  return {
                    id: result.place_id,
                    name: result.name,
                    address: result.vicinity ?? 'Address unavailable',
                    isOpen: result.opening_hours?.open_now === true,
                    rating: result.rating,
                    latitude: poiCoords.latitude,
                    longitude: poiCoords.longitude,
                    source: 'google' as const,
                    categoryLabel: POI_CATEGORIES[categoryKey as CategoryKey]?.title,
                    distance: getDistanceMeters(
                      currentCoords.latitude,
                      currentCoords.longitude,
                      poiCoords.latitude,
                      poiCoords.longitude
                    ),
                  };
                })
                .filter((poi) => poi.latitude !== 0 && poi.longitude !== 0)
                .sort((a, b) => a.distance - b.distance);

              // Cache the results
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
          })
        );
      }

      if (cancelled) return;

      setCategories((prev) => {
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
      });

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

  if (selectedCategoryEntry) {
    const [, category] = selectedCategoryEntry;
    const visiblePois = category.pois.slice(0, seeAllVisibleCount);
    const hasMoreSeeAllItems = seeAllVisibleCount < category.pois.length;

    return (
      <View style={[styles.fullPageContainer, { backgroundColor: bgColor }]}> 
        <View style={[styles.fullPageHeader, { borderBottomColor: borderColor }]}> 
          <TouchableOpacity
            onPress={() => setSelectedSeeAllCategory(null)}
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
          onMomentumScrollBegin={() => {
            canLoadMoreRef.current = true;
          }}
          onEndReached={() => {
            if (!hasMoreSeeAllItems || !canLoadMoreRef.current) return;
            canLoadMoreRef.current = false;
            setSeeAllVisibleCount((prev) => Math.min(prev + SEE_ALL_PAGE_SIZE, category.pois.length));
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item: poi }) => (
            <POICard
              poi={poi}
              onPress={handleOpenPoiDetails}
              onGetDirections={handleGetDirections}
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={Object.values(categories).some((category) => category.isLoading)}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#0a84ff' : '#007aff'}
        />
      }
    >

      {/* Search Bar (Placeholder) */}
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
        <TouchableOpacity style={[styles.actionButton, { borderColor }]} onPress={handleRefresh}>
          <FontAwesome name="refresh" size={14} color="#a94a5c" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.filterActionButton,
            { borderColor, backgroundColor: hasActiveFilters ? (isDark ? '#3a2a2f' : '#fdecef') : 'transparent' },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <FontAwesome name="sliders" size={14} color="#a94a5c" />
          <Text style={styles.actionButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {previewCategories.map(([key, category]) => {
        const totalCategoryCount = filteredCategories.find(([categoryKey]) => categoryKey === key)?.[1].pois.length ?? 0;

        return (
        <POICategory 
          key={key}
          categoryKey={key}
          category={category}
          onPressPoi={handleOpenPoiDetails}
          onGetDirections={handleGetDirections}
          onSeeAll={handleSeeAll}
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
        onClose={closePoiDetailsModal}
        onGetDirections={(buildingData) => {
          const coords = buildingData?.geometry?.coordinates?.[0]?.[0];
          if (!coords) return;

          const [longitude, latitude] = coords;
          handleGetDirections({
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
          });
        }}
      />

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModal, { backgroundColor: bgColor, borderColor }]}> 
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: textColor }]}>Filter POIs</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
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
                    onPress={() => toggleCategoryFilter(categoryKey)}
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
                  onValueChange={(value) => {
                    setSelectedRadiusKm(value);
                    setRadiusInputKm(value.toFixed(1));
                  }}
                  minimumTrackTintColor="#a94a5c"
                  maximumTrackTintColor={isDark ? '#3f3f44' : '#d7d7db'}
                  thumbTintColor="#a94a5c"
                />
              </View>
              <TextInput
                value={radiusInputKm}
                onChangeText={handleRadiusInputChange}
                onBlur={handleRadiusInputBlur}
                onSubmitEditing={handleRadiusInputBlur}
                keyboardType="decimal-pad"
                style={[styles.radiusInlineInput, { color: textColor }]}
              />
              <Text style={[styles.radiusInlineUnit, { color: textColor }]}>km</Text>
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity style={[styles.clearButton, { borderColor }]} onPress={clearAllFilters}>
                <Text style={{ color: '#a94a5c', fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function POICategory({ 
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
            {poi.distance < 1000 ? `${Math.round(poi.distance)}m` : `${(poi.distance / 1000).toFixed(1)}km`}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fullPageContainer: {
    flex: 1,
  },
  fullPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPageTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  fullPageList: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  loadMoreHint: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterActionButton: {
    marginLeft: 0,
  },
  actionButtonText: {
    color: '#a94a5c',
    marginLeft: 6,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  poiScroll: {
    marginHorizontal: -16,
  },
  poiScrollContent: {
    paddingHorizontal: 16,
  },
  poiCard: {
    width: 240,
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  poiCardVertical: {
    width: '100%',
    marginRight: 0,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  poiName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  poiAddress: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a94a5c',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  directionsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#a94a5c',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  applyButton: {
    backgroundColor: '#a94a5c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  radiusInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  radiusSliderWrap: {
    flex: 1,
    marginRight: 8,
  },
  radiusInlineInput: {
    minWidth: 38,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'right',
    paddingVertical: 0,
  },
  radiusInlineUnit: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
});
