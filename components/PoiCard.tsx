import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { styles, MAROON, MUTED } from '../styles/searchBar.styles';

interface PoiCardProps {
  poi: any;
  onPress: (poi: any) => void;
}

export default function PoiCard({ poi, onPress }: PoiCardProps) {
  // Simple logic to choose an icon based on type
  const getIcon = (type: string) => {
    if (type.includes('washroom')) return 'tint'; // or 'restroom' if you have FA5
    if (type.includes('water')) return 'glass';
    if (type.includes('elevator')) return 'chevron-up';
    if (type.includes('stair')) return 'bars';
    return 'map-marker';
  };

  return (
    <TouchableOpacity style={styles.buildingCard} onPress={() => onPress(poi)}>
      <View style={styles.buildingRow}>
        <View style={styles.buildingIconBox}>
          <FontAwesome name={getIcon(poi.type) as any} size={18} color={MAROON} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.buildingName}>{poi.name} - Floor {poi.floor}</Text>
          <Text style={styles.buildingSub}>{poi.buildingCode} Building</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '900', color: MAROON }}>{Math.round(poi.distance)}m</Text>
          <Text style={{ fontSize: 10, color: MUTED }}>{Math.round(poi.distance / 80)} MIN WALK</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
