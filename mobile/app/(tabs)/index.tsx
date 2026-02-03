import React, { useMemo } from "react";
import MapView, { Marker, Polygon } from 'react-native-maps';
import { StyleSheet, View } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS } from '../../constants/campusLocations';
import { BUILDING_POLYGON_COLORS } from '../../constants/mapColors';
import sgwBuildingsData from '../../data/buildings/sgw.json';
import loyolaBuildingsData from '../../data/buildings/loyola.json';

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const campusBuildingsData = [
    ...sgwBuildingsData.features, ...loyolaBuildingsData.features,
  ];

  const defaultCampus = CAMPUSES[DEFAULT_CAMPUS];

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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={defaultCampus.initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {buildingPolygons}
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
  }
});
