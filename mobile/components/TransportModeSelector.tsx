import type { MapViewDirectionsMode } from 'react-native-maps-directions';
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { styles, MAROON } from '../styles/searchBar.styles';


type Props = {
  selectedMode: MapViewDirectionsMode;
  onModeSelect: (mode: MapViewDirectionsMode) => void;
  disabled?: boolean;
};

const MODES: { mode: MapViewDirectionsMode; label: string; icon: string }[] = [
  { mode: 'DRIVING', label: 'Driving', icon: 'car' },
  { mode: 'WALKING', label: 'Walking', icon: 'walking' },
  { mode: 'BICYCLING', label: 'Cycling', icon: 'bicycle' },
  { mode: 'TRANSIT', label: 'Transit', icon: 'bus' },
];

export default function TransportModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
}: Props) {
  return (
    <View style={styles.transportModeSelectorRow}>
      {MODES.map((modeOption) => {
        const isSelected = selectedMode === modeOption.mode;
        return (
          <TouchableOpacity
            key={modeOption.mode}
            style={[
              styles.transportModeButton,
              isSelected && styles.transportModeButtonActive,
              disabled && styles.transportModeButtonDisabled,
              styles.transportModeButtonFlex
            ]}
            onPress={() => onModeSelect(modeOption.mode)}
            activeOpacity={0.85}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={modeOption.label}
            accessibilityState={{ selected: isSelected }}
          >
            <FontAwesome5
              name={modeOption.icon}
              size={18}
              color={isSelected ? MAROON : '#6B7280'}
            />
            <Text
              style={[
                styles.transportModeText,
                isSelected && styles.transportModeTextActive,
              ]}
            >
              {modeOption.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}