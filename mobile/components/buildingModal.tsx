import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BuildingData {
  id: string;
  properties: {
    code?: string;
    name?: string;
    'address:number'?: string;
    'address:street'?: string;
    'address:city'?: string;
    accessibility?: string[];
    amenities?: string[];
  };
}

interface BuildingModalProps {
  visible: boolean;
  building: BuildingData | null;
  onClose: () => void;
}

const formatAccessibilityName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatAmenityName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function BuildingModal({ visible, building, onClose }: BuildingModalProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const screenHeight = Dimensions.get('window').height;

  if (!building) return null;

  const { code, name, 'address:number': number, 'address:street': street, 'address:city': city, accessibility, amenities } = building.properties;

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', height: screenHeight * 0.55 }]}>
          <View style={styles.handle} />
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <View style={styles.section}>
              <Text style={[styles.buildingCode, { color: '#8B0000' }]}>{code}</Text>
              <Text style={[styles.buildingName, { color: isDark ? '#ffffff' : '#000000' }]}>{name}</Text>
            </View>

            {(number || street || city) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Address</Text>
                <Text style={[styles.sectionContent, { color: isDark ? '#cccccc' : '#333333' }]}>
                  {number} {street}
                </Text>
                <Text style={[styles.sectionContent, { color: isDark ? '#cccccc' : '#333333' }]}>
                  {city}
                </Text>
              </View>
            )}

            {accessibility && accessibility.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Accessibility</Text>
                <View style={styles.itemsList}>
                  {accessibility.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={[styles.listItemText, { color: isDark ? '#cccccc' : '#333333' }]}>
                        • {formatAccessibilityName(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {amenities && amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Amenities</Text>
                <View style={styles.itemsList}>
                  {amenities.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={[styles.listItemText, { color: isDark ? '#cccccc' : '#333333' }]}>
                        • {formatAmenityName(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => {}} // Get Directions button to be implemented later
              activeOpacity={0.7}
            >
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  buildingCode: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buildingName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemsList: {
    gap: 8,
  },
  listItem: {
    marginLeft: 5,
  },
  listItemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  directionsButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
