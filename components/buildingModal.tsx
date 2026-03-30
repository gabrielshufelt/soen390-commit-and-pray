import React, { useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import BUILDING_IMAGES from '../constants/buildingImages';
import { COLORS } from '../constants/modalColors';
import { SHEET_HEIGHT, DISMISS_THRESHOLD, VELOCITY_THRESHOLD } from '../constants/modalSheet';
import { AMENITY_ICONS, ACCESSIBILITY_ICONS, UI_ICONS, renderIcon } from '../constants/buildingIcons';


export interface BuildingData {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    code?: string;
    name?: string;
    address?: string;
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:province'?: string;
    accessibility?: string[];
    amenities?: string[];
    phoneNumber?: string;
    pricing?: string;
    website?: string;
    rating?: number;
    isOpen?: boolean;
    categoryLabel?: string;
    photoUrl?: string;
    detailsLoading?: boolean;
    detailsError?: string;
  };
}

interface BuildingModalProps {
  visible: boolean;
  building: BuildingData | null;
  onClose: () => void;
  onDirectionsFrom?: (building: BuildingData) => void;
  onDirectionsTo?: (building: BuildingData) => void;
  onGetDirections?: (building: BuildingData) => void;
  mode?: 'building' | 'poi';
}

export default function BuildingModal({ visible, building, onClose, onDirectionsFrom, onDirectionsTo, onGetDirections, mode = 'building' }: BuildingModalProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const currentPosRef = useRef(SHEET_HEIGHT);

  const bgColor = isDark ? COLORS.darkBg : COLORS.lightBg;
  const textColor = isDark ? COLORS.darkText : COLORS.lightText;
  const secondaryColor = isDark ? COLORS.darkSecondary : COLORS.lightSecondary;
  const addressGreen = isDark ? COLORS.addressGreenDark : COLORS.addressGreenLight;
  const iconTileColor = isDark ? COLORS.darkCard : COLORS.lightCard;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_HEIGHT);
      currentPosRef.current = 0;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      currentPosRef.current = SHEET_HEIGHT;
      onClose();
    });
  }, [onClose, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        const newPos = currentPosRef.current + gs.dy;
        if (newPos >= 0) {
          translateY.setValue(newPos);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const finalPos = Math.max(0, currentPosRef.current + gs.dy);

        if (gs.vy > VELOCITY_THRESHOLD) {
          currentPosRef.current = SHEET_HEIGHT;
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onClose());
          return;
        }

        if (gs.vy < -VELOCITY_THRESHOLD) {
          currentPosRef.current = 0;
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
          return;
        }

        if (finalPos > DISMISS_THRESHOLD) {
          currentPosRef.current = SHEET_HEIGHT;
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onClose());
          return;
        }

        currentPosRef.current = 0;
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      },
    })
  ).current;

  const handleOpenWebsite = useCallback(async (url?: string) => {
    if (!url) return;
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    const supported = await Linking.canOpenURL(normalizedUrl);
    if (supported) {
      await Linking.openURL(normalizedUrl);
    }
  }, []);

  const handleCallPhone = useCallback(async (phone?: string) => {
    if (!phone) return;
    const normalizedPhone = phone.replace(/[^\d+]/g, '');
    if (!normalizedPhone) {
      Alert.alert('Call unavailable', 'This phone number is not valid.');
      return;
    }

    Alert.alert(
      'Call phone number',
      phone,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          style: 'default',
          onPress: () => {
            const primaryScheme = Platform.OS === 'ios' ? 'telprompt' : 'tel';
            const primaryUrl = `${primaryScheme}:${normalizedPhone}`;
            const fallbackUrl = `tel:${normalizedPhone}`;

            void (async () => {
              try {
                await Linking.openURL(primaryUrl);
              } catch {
                try {
                  await Linking.openURL(fallbackUrl);
                } catch {
                  Alert.alert('Call unavailable', 'This device cannot place phone calls.');
                }
              }
            })();
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  if (!building) return null;

  const {
    code,
    name,
    address,
    'addr:housenumber': number,
    'addr:street': street,
    'addr:city': city,
    accessibility,
    amenities,
    phoneNumber,
    pricing,
    website,
    rating,
    isOpen,
    categoryLabel,
    photoUrl,
    detailsLoading,
    detailsError,
  } = building.properties;

  const buildingImage = mode === 'poi' ? (photoUrl ? { uri: photoUrl } : null) : (code ? BUILDING_IMAGES[code] : null);
  const hasAddress = mode === 'poi' ? !!address : !!(number || street || city);

  const addressParts: string[] = [];
  if (number && street) addressParts.push(`${number} ${street}`);
  else if (street) addressParts.push(street);
  else if (number) addressParts.push(number);
  if (city) addressParts.push(city);
  const addressString = mode === 'poi' ? address ?? '' : addressParts.join(', ');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={handleClose}
          activeOpacity={1}
          testID="modal-backdrop"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: bgColor,
              height: SHEET_HEIGHT,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers} testID="drag-handle">
            <View style={[styles.handleBar, { backgroundColor: isDark ? '#555' : '#ccc' }]} />
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose} testID="close-button">
            {renderIcon(UI_ICONS.close, 18, secondaryColor)}
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {(code || (mode === 'poi' && categoryLabel)) && (
              <View style={[styles.codeBadge, { backgroundColor: isDark ? '#3a1a1a' : '#fdf2f2' }]}>
                <Text style={[styles.codeBadgeText, { color: COLORS.red }]}>{code ?? categoryLabel}</Text>
              </View>
            )}

            <Text style={[styles.buildingName, { color: textColor }]}>{name}</Text>

            {hasAddress && (
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  {renderIcon(UI_ICONS.mapMarker, 13, addressGreen)}
                </View>
                <Text style={[styles.addressText, { color: addressGreen }]}>{addressString}</Text>
              </View>
            )}

            {buildingImage && (
              <View style={[styles.imageContainer, { backgroundColor: iconTileColor }]}>
                <Image
                  source={buildingImage}
                  style={styles.buildingImage}
                  resizeMode="cover"
                  testID="building-image"
                />
              </View>
            )}

            {mode === 'poi' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: secondaryColor }]}>DETAILS</Text>

                <View style={styles.poiMetaContainer}>
                  <Text style={[styles.poiMetaLabel, { color: secondaryColor }]}>Phone</Text>
                  {phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => {
                        void handleCallPhone(phoneNumber);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${name ?? 'poi'}`}
                    >
                      <Text style={[styles.poiMetaValue, styles.poiClickableValue, { color: COLORS.red }]}>{phoneNumber}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.poiMetaValue, { color: textColor }]}>Phone unavailable</Text>
                  )}
                </View>

                <View style={styles.poiMetaContainer}>
                  <Text style={[styles.poiMetaLabel, { color: secondaryColor }]}>Pricing</Text>
                  <Text style={[styles.poiMetaValue, { color: textColor }]}>{pricing ?? 'Not available'}</Text>
                </View>

                <View style={styles.poiMetaContainer}>
                  <Text style={[styles.poiMetaLabel, { color: secondaryColor }]}>Status</Text>
                  <Text style={[styles.poiMetaValue, { color: isOpen ? '#34C759' : '#FF3B30' }]}>
                    {isOpen ? 'Open now' : 'Closed'}
                  </Text>
                </View>

                {rating !== undefined && (
                  <View style={styles.poiMetaContainer}>
                    <Text style={[styles.poiMetaLabel, { color: secondaryColor }]}>Rating</Text>
                    <Text style={[styles.poiMetaValue, { color: textColor }]}>{rating.toFixed(1)}/5</Text>
                  </View>
                )}

                {website && (
                  <View style={styles.poiMetaContainer}>
                    <Text style={[styles.poiMetaLabel, { color: secondaryColor }]}>Website</Text>
                    <TouchableOpacity
                      onPress={() => {
                        void handleOpenWebsite(website);
                      }}
                      accessibilityRole="link"
                      accessibilityLabel={`Open website for ${name ?? 'poi'}`}
                    >
                      <Text style={[styles.poiMetaValue, styles.poiClickableValue, { color: COLORS.red }]} numberOfLines={2}>{website}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {detailsLoading && (
                  <Text style={[styles.poiFetchStatus, { color: secondaryColor }]}>Fetching details...</Text>
                )}

                {!!detailsError && (
                  <Text style={[styles.poiFetchStatusError, { color: isDark ? '#ff9f9f' : '#b42318' }]}>Could not load full details: {detailsError}</Text>
                )}
              </View>
            )}

            {mode === 'building' && amenities && amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: secondaryColor }]}>SERVICES</Text>
                <View style={styles.iconsRow}>
                  {amenities.map((key) => {
                    const config = AMENITY_ICONS[key];
                    if (!config) return null;
                    return (
                      <View key={key} style={[styles.iconTile, { backgroundColor: iconTileColor }]}>
                        {renderIcon(config, 20, isDark ? '#e0e0e0' : '#444')}
                        <Text
                          style={[styles.iconLabel, { color: secondaryColor }]}
                          numberOfLines={1}
                        >
                          {config.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {mode === 'building' && accessibility && accessibility.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: secondaryColor }]}>ACCESSIBILITY</Text>
                <View style={styles.iconsRow}>
                  {accessibility.map((key) => {
                    const config = ACCESSIBILITY_ICONS[key];
                    if (!config) return null;
                    return (
                      <View key={key} style={[styles.iconTile, { backgroundColor: iconTileColor }]}>
                        {renderIcon(config, 20, isDark ? '#e0e0e0' : '#444')}
                        <Text
                          style={[styles.iconLabel, { color: secondaryColor }]}
                          numberOfLines={1}
                        >
                          {config.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.buttonsContainer}>
              {mode === 'building' && (
                <>
                  <TouchableOpacity
                    style={[styles.directionButton, styles.directionButtonFrom, { borderColor: COLORS.red }]}
                    onPress={() => {
                      onDirectionsFrom?.(building);
                      handleClose();
                    }}
                    activeOpacity={0.7}
                    testID="directions-from-button"
                  >
                    <View style={styles.buttonIcon}>{renderIcon(UI_ICONS.route, 16, COLORS.red)}</View>
                    <Text style={[styles.directionButtonFromText, { color: COLORS.red }]}>Get Directions From</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      styles.directionButtonTo,
                      { backgroundColor: COLORS.red },
                    ]}
                    onPress={() => {
                      onDirectionsTo?.(building);
                      handleClose();
                    }}
                    activeOpacity={0.7}
                    testID="directions-to-button"
                  >
                    <View style={styles.buttonIcon}>{renderIcon(UI_ICONS.route, 16, '#fff')}</View>
                    <Text style={styles.directionButtonToText}>Get Directions To</Text>
                  </TouchableOpacity>
                </>
              )}

              {mode === 'poi' && (
                <TouchableOpacity
                  style={[
                    styles.directionButton,
                    styles.directionButtonTo,
                    { backgroundColor: COLORS.red },
                  ]}
                  onPress={() => {
                    onGetDirections?.(building);
                    handleClose();
                  }}
                  activeOpacity={0.7}
                  testID="directions-poi-button"
                >
                  <View style={styles.buttonIcon}>{renderIcon(UI_ICONS.route, 16, '#fff')}</View>
                  <Text style={styles.directionButtonToText}>Get Directions</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 16,
  },

  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  closeButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
    padding: 8,
  },

  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  buildingName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 28,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressIcon: {
    marginRight: 6,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },

  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
  },
  buildingImage: {
    width: '100%',
    height: 170,
  },

  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 72,
  },
  iconLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  poiMetaContainer: {
    marginBottom: 10,
  },
  poiMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  poiMetaValue: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  poiClickableValue: {
    textDecorationLine: 'underline',
  },
  poiFetchStatus: {
    fontSize: 13,
    marginTop: 6,
  },
  poiFetchStatusError: {
    fontSize: 13,
    marginTop: 6,
  },

  buttonsContainer: {
    marginTop: 6,
    gap: 10,
    marginBottom: 10,
  },
  directionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  directionButtonFrom: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  directionButtonTo: {
    borderWidth: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  directionButtonFromText: {
    fontSize: 15,
    fontWeight: '600',
  },
  directionButtonToText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});