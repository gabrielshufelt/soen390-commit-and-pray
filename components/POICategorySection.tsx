import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { styles } from '@/styles/nearby.styles';
import NearbyPOICard from './NearbyPOICard';
import { MAX_POIS_PER_CATEGORY } from '@/constants/poiCategories';
import type { CategoryKey } from '@/constants/poiCategories';
import type { POI, POICategory } from '@/constants/poi.types';

export function SeeAllCategoryView({
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
          <NearbyPOICard
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

export default function POICategorySection({
  categoryKey,
  category,
  onPressPoi,
  onGetDirections,
  onSeeAll,
  totalCount,
  isDark,
  textColor,
  secondaryBgColor,
  borderColor,
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

      {category.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={isDark ? '#0a84ff' : '#007aff'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            Loading {category.title.toLowerCase()}...
          </Text>
        </View>
      )}

      {category.error && !category.isLoading && (
        <View style={[styles.emptyState, { backgroundColor: secondaryBgColor }]}> 
          <FontAwesome name="exclamation-circle" size={24} color={isDark ? '#8e8e93' : '#6e6e73'} />
          <Text style={{ color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 8 }}>
            {category.error}
          </Text>
        </View>
      )}

      {!category.isLoading && category.pois.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.poiScrollContent}
          style={styles.poiScroll}
          data={category.pois}
          keyExtractor={(poi) => poi.id}
          renderItem={({ item: poi }) => (
            <NearbyPOICard
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
