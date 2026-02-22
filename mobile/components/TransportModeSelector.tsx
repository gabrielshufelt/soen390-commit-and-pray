import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { styles, MAROON } from '../styles/searchBar.styles';
import type { TransportMode } from '../hooks/useDirections';

type Props = {
  selectedMode: TransportMode;
  onModeSelect: (mode: TransportMode) => void;
  disabled?: boolean;
};

const MODES: { mode: TransportMode; label: string; icon: string }[] = [
  { mode: 'driving', label: 'Driving', icon: 'car' },
  { mode: 'walking', label: 'Walking', icon: 'walking' },
  { mode: 'bicycling', label: 'Cycling', icon: 'bicycle' },
  { mode: 'transit', label: 'Transit', icon: 'bus' },
];

export default function TransportModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
}: Props) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      {MODES.map((modeOption) => {
        const isSelected = selectedMode === modeOption.mode;
        return (
          <TouchableOpacity
            key={modeOption.mode}
            style={[
              styles.transportModeButton,
              isSelected && styles.transportModeButtonActive,
              disabled && styles.transportModeButtonDisabled,
              { flex: 1, marginHorizontal: 4 }
            ]}
            onPress={() => !disabled && onModeSelect(modeOption.mode)}
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