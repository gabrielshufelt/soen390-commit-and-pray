import React, { useMemo } from "react";
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS, findCampusForCoordinate } from '../../constants/campusLocations';
import { useLocationPermissions } from '../../hooks/useLocationPermissions';
import { useWatchLocation } from '../../hooks/useWatchLocation';

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const defaultCampus = CAMPUSES[DEFAULT_CAMPUS];
  const permissionState = useLocationPermissions();
  const { location } = useWatchLocation({ enabled: permissionState.granted });

  const currentCampus = useMemo(() => {
    if (!location) return undefined;
    return findCampusForCoordinate(
      location.coords.latitude,
      location.coords.longitude
    );
  }, [location]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={defaultCampus.initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation
      >
        {Object.entries(CAMPUSES).map(([key, campus]) => (
          <Marker
            key={key}
            coordinate={campus.coordinate}
            title={campus.name}
          />
        ))}
      </MapView>
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Current Location</Text>
        <Text style={styles.overlayValue}>
          {permissionState.granted
            ? currentCampus?.campus.name ?? 'Outside campus boundaries'
            : 'Location permission required'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  overlayTitle: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  overlayValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  }
});
