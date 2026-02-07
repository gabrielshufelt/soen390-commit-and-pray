import React, { useMemo, useRef, useEffect, useState } from "react";
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS, findCampusForCoordinate } from '../../constants/campusLocations';
import { BUILDING_POLYGON_COLORS } from '../../constants/mapColors';
import { useLocationPermissions } from '../../hooks/useLocationPermissions';
import { useWatchLocation } from '../../hooks/useWatchLocation';
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import sgwBuildingsData from '../../data/buildings/sgw.json';
import loyolaBuildingsData from '../../data/buildings/loyola.json';
import CampusToggle from '../../components/campusToggle';

// Calculate the center of a polygon
const getPolygonCentroid = (coordinates: [number, number][]) => {
  let latSum = 0;
  let lngSum = 0;
  const n = coordinates.length;

  for (const [lng, lat] of coordinates) {
    latSum += lat;
    lngSum += lng;
  }

  return {
    latitude: latSum / n,
    longitude: lngSum / n,
  };
};

// Zoom threshold for showing labels (smaller = more zoomed in)
const LABEL_ZOOM_THRESHOLD = 0.015;

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const campusBuildingsData = [
    ...sgwBuildingsData.features, ...loyolaBuildingsData.features,
  ];

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
  const [campusKey, setCampusKey] = useState(DEFAULT_CAMPUS);
  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );

  const handleRegionChange = (region: Region) => {
    setShowLabels(region.latitudeDelta <= LABEL_ZOOM_THRESHOLD);
  };

  const selectedCampus = useMemo(() => {
      return CAMPUSES[campusKey] ?? CAMPUSES[DEFAULT_CAMPUS];
    }, [campusKey]
  );

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
      mapRef.current?.animateToRegion(selectedCampus.initialRegion, 600);
    }, [selectedCampus]
  );

  const buildingPolygons = useMemo(
    () =>
      campusBuildingsData.map((building) => (
        <Polygon
          key={building.id}
          coordinates={building.geometry.coordinates[0].map(
            ([longitude, latitude]) => ({
              latitude,
              longitude,
            })
          )}
          fillColor={BUILDING_POLYGON_COLORS.fillColor}
          strokeColor={BUILDING_POLYGON_COLORS.strokeColor}
          strokeWidth={BUILDING_POLYGON_COLORS.strokeWidth}
        />
      )),
    []
  );

  const buildingLabels = useMemo(
    () =>
      campusBuildingsData
        .filter((building) => (building.properties as { code?: string }).code)
        .map((building) => {
          const centroid = getPolygonCentroid(building.geometry.coordinates[0]);
          const code = (building.properties as { code: string }).code;
          return (
            <Marker
              key={`label-${building.id}`}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.labelContainer}>
                <Text style={styles.buildingLabel}>{code}</Text>
              </View>
            </Marker>
          );
        }),
    []
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={selectedCampus.initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation
        onRegionChangeComplete={handleRegionChange}
      >
        {buildingPolygons}
        {showLabels && buildingLabels}
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
      <CampusToggle
         selectedCampus={campusKey}
         onCampusChange={setCampusKey}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
   mapContainer: {
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
  labelContainer: {
    backgroundColor: 'transparent',
  },
  buildingLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
