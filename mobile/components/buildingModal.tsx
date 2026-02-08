import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const BLACK = 'rgba(0, 0, 0)';
const WHITE = 'rgba(255, 255, 255)';
const RED = '#8B0000';

interface BuildingData {
  id: string;
  properties: {
    code?: string;
    name?: string;
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:province'?: string;
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

  const { code, name, 'addr:housenumber': number, 'addr:street': street, 'addr:city': city, 'addr:province': province, accessibility, amenities } = building.properties;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: isDark ? BLACK : WHITE, height: screenHeight * 0.55 }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={{ color: isDark ? WHITE : BLACK, fontSize: 16 }}>X</Text> 
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={[styles.buildingCode, { color: RED }]}>{code}</Text>
              <Text style={[styles.buildingName, { color: isDark ? WHITE : BLACK }]}>{name}</Text>
            </View>

            {(number || street || city || province) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? WHITE : BLACK }]}>Address</Text>
                <Text style={[styles.sectionContent, { color: isDark ? WHITE : BLACK }]}>
                  {number} {street}{city ? `,` : ''}
                </Text>
                <Text style={[styles.sectionContent, { color: isDark ? WHITE : BLACK }]}>
                  {city}{province ? `, ${province}` : ''}
                </Text>
              </View>
            )}

            {accessibility && accessibility.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? WHITE : BLACK }]}>Accessibility</Text>
                <View style={styles.itemsList}>
                  {accessibility.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={[styles.listItemText, { color: isDark ? WHITE : BLACK }]}>
                        • {formatAccessibilityName(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {amenities && amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: isDark ? WHITE : BLACK }]}>Amenities</Text>
                <View style={styles.itemsList}>
                  {amenities.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={[styles.listItemText, { color: isDark ? WHITE : BLACK }]}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 12,
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
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
    backgroundColor: RED,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});
