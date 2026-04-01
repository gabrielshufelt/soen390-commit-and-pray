import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import BuildingModal from '../../components/buildingModal';
import POICategorySection, { SeeAllCategoryView } from '../../components/POICategorySection';
import type { BuildingData } from '../../components/buildingModal';
import { useTheme } from '../../context/ThemeContext';
import { useWatchLocation } from '../../hooks/useWatchLocation';
import { getDistanceMeters } from '../../utils/geometry';
import { clearCache } from '@/utils/poiCache';
import { applyFetchedResults, buildStudySpacePois, fetchGoogleCategoryResults, resolvePoiDetails } from '@/utils/poiFetch';
import { styles } from '@/styles/nearby.styles';
import {
  CATEGORY_KEYS,
  DEFAULT_RADIUS_KM,
  FETCH_DEBOUNCE_MS,
  FETCH_MIN_DISTANCE_METERS,
  MAX_POIS_PER_CATEGORY,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  POI_CATEGORIES,
  SEE_ALL_PAGE_SIZE,
} from '@/constants/poiCategories';
import type {
  CategoryKey,
} from '@/constants/poiCategories';
import type {
  Coordinates,
  POI,
  POICategory,
} from '@/constants/poi.types';

const createInitialCategories = (): Record<string, POICategory> =>
  Object.fromEntries(
    CATEGORY_KEYS.map((key) => [
      key,
      { title: POI_CATEGORIES[key].title, icon: POI_CATEGORIES[key].icon, pois: [], isLoading: true },
    ])
  );

const ALL_CATEGORIES_SELECTED = Object.fromEntries(
  CATEGORY_KEYS.map((key) => [key, true])
) as Record<CategoryKey, boolean>;

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

const getFilterActionBackgroundColor = (hasActiveFilters: boolean, isDark: boolean): string => {
  if (!hasActiveFilters) return 'transparent';
  return isDark ? '#3a2a2f' : '#fdecef';
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

      {/* Placeholder search UI: intentionally disabled until full search behavior is implemented by @yassinehajou. */}
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
  const [selectedCategories, setSelectedCategories] = useState<Record<CategoryKey, boolean>>(ALL_CATEGORIES_SELECTED);
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
    setSelectedCategories(ALL_CATEGORIES_SELECTED);
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