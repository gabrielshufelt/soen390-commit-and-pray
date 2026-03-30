import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useWatchLocation } from '../../hooks/useWatchLocation';
import { getDistanceMeters } from '../../utils/geometry';

interface POI {
  id: string;
  name: string;
  address: string;
  distance: number;
  isOpen: boolean;
  rating?: number;
  latitude: number;
  longitude: number;
}

interface POICategory {
  title: string;
  icon: string;
  pois: POI[];
  isLoading: boolean;
  error?: string;
}

const POI_CATEGORIES = {
  coffee: { title: 'Coffee Shops', icon: 'coffee', color: '#8B4513' },
  restaurant: { title: 'Restaurants', icon: 'utensils', color: '#D2691E' },
  grocery: { title: 'Grocery Stores', icon: 'shopping-cart', color: '#228B22' },
};

export default function NearbyScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { location } = useWatchLocation();

  const [categories, setCategories] = useState<Record<string, POICategory>>({
    coffee: { title: POI_CATEGORIES.coffee.title, icon: POI_CATEGORIES.coffee.icon, pois: [], isLoading: true },
    restaurant: { title: POI_CATEGORIES.restaurant.title, icon: POI_CATEGORIES.restaurant.icon, pois: [], isLoading: true },
    grocery: { title: POI_CATEGORIES.grocery.title, icon: POI_CATEGORIES.grocery.icon, pois: [], isLoading: true },
  });

  const [lastLocationUpdateTime, setLastLocationUpdateTime] = useState<number>(0);

  // TODO: Fetch POIs from Google Places API when location changes significantly (>150m)
  useEffect(() => {
    if (!location) {
      setCategories((prev) => ({
        ...prev,
        coffee: { ...prev.coffee, error: 'Location permission required' },
        restaurant: { ...prev.restaurant, error: 'Location permission required' },
        grocery: { ...prev.grocery, error: 'Location permission required' },
      }));
      return;
    }

    const now = Date.now();
    // Debounce: only fetch if more than 2 seconds since last update
    if (now - lastLocationUpdateTime < 2000) return;

    // TODO: Check distance moved - only fetch if > 150m
    // TODO: Call Google Places API for each category
    // TODO: Filter for open-now results
    // TODO: Sort by distance and limit to 5 results

    setLastLocationUpdateTime(now);
  }, [location, lastLocationUpdateTime]);

  const textColor = isDark ? '#ffffff' : '#000000';
  const bgColor = isDark ? '#1c1c1e' : '#ffffff';
  const secondaryBgColor = isDark ? '#2c2c2e' : '#f2f2f7';
  const borderColor = isDark ? '#38383a' : '#e5e5ea';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Nearby</Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
          5 closest places near you
        </Text>
      </View>

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

      {/* Filter Button (Placeholder) */}
      <TouchableOpacity style={[styles.filterButton, { borderColor }]} disabled>
        <FontAwesome name="sliders" size={14} color="#a94a5c" />
        <Text style={{ color: '#a94a5c', marginLeft: 6, fontWeight: '600' }}>Filter</Text>
      </TouchableOpacity>

      {/* Categories */}
      {Object.entries(categories).map(([key, category]) => (
        <POICategory 
          key={key}
          category={category}
          isDark={isDark}
          textColor={textColor}
          secondaryBgColor={secondaryBgColor}
          borderColor={borderColor}
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function POICategory({ 
  category, 
  isDark, 
  textColor, 
  secondaryBgColor, 
  borderColor 
}: Readonly<{
  category: POICategory;
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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.poiScroll}
        >
          {category.pois.map((poi) => (
            <POICard 
              key={poi.id} 
              poi={poi} 
              isDark={isDark} 
              secondaryBgColor={secondaryBgColor}
              borderColor={borderColor}
            />
          ))}
        </ScrollView>
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
  isDark, 
  secondaryBgColor,
  borderColor 
}: Readonly<{
  poi: POI;
  isDark: boolean;
  secondaryBgColor: string;
  borderColor: string;
}>) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#8e8e93' : '#6e6e73';

  return (
    <TouchableOpacity 
      style={[
        styles.poiCard, 
        { 
          backgroundColor: secondaryBgColor,
          borderColor: borderColor,
        }
      ]}
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
        // TODO: Wire up navigation to existing directions flow
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    marginBottom: 12,
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
    paddingHorizontal: 16,
  },
  poiCard: {
    width: 240,
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
});
