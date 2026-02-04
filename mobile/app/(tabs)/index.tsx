import React, { useMemo, useState } from "react";
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS } from '../../constants/campusLocations';
import { BUILDING_POLYGON_COLORS } from '../../constants/mapColors';
import sgwBuildingsData from '../../data/buildings/sgw.json';
import loyolaBuildingsData from '../../data/buildings/loyola.json';

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
  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );

  const handleRegionChange = (region: Region) => {
    setShowLabels(region.latitudeDelta <= LABEL_ZOOM_THRESHOLD);
  };

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
        style={styles.map}
        initialRegion={defaultCampus.initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
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
