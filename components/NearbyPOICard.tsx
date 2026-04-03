import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { styles } from '@/styles/nearby.styles';
import type { POI } from '@/constants/poi.types';

const formatDistance = (distance: number): string => {
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
};

export default function NearbyPOICard({
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
          borderColor,
        },
      ]}
      onPress={() => onPress(poi)}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${poi.name}`}
    >
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
