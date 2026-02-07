import React, { useMemo, useRef, useEffect, useState } from "react";
import MapView, { Marker, Polygon, Region, Callout } from 'react-native-maps';
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS } from '../../constants/campusLocations';
import { BUILDING_POLYGON_COLORS } from '../../constants/mapColors';
import sgwBuildingsData from '../../data/buildings/sgw.json';
import loyolaBuildingsData from '../../data/buildings/loyola.json';
import CampusToggle from '../../components/campusToggle';
import BuildingModal from '../../components/buildingModal';

const HIGHLIGHT_COLOR = 'rgba(33, 150, 243, 0.4)'; // Light blue with transparency

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
  const [campusKey, setCampusKey] = useState(DEFAULT_CAMPUS);
  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );

  // Selectable building for future implementation; can remove this comment later
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<any>(null);

  const handleRegionChange = (region: Region) => {
    setShowLabels(region.latitudeDelta <= LABEL_ZOOM_THRESHOLD);
  };

  const handleBuildingSelect = (buildingId: string, buildingData: any) => {
    setSelectedBuilding(buildingId);
    setSelectedBuildingData(buildingData);
  };

  const handleCloseModal = () => {
    setSelectedBuilding(null);
    setSelectedBuildingData(null);
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
      campusBuildingsData.map((building) => {
        const centroid = getPolygonCentroid(building.geometry.coordinates[0]);
        const code = (building.properties as { code?: string }).code || 'Unknown';
        const name = (building.properties as { name?: string }).name || 'Building';

        return (
          <React.Fragment key={building.id}>
            <Polygon
              coordinates={building.geometry.coordinates[0].map(
                ([longitude, latitude]) => ({
                  latitude,
                  longitude,
                })
              )}
              fillColor={
                selectedBuilding === building.id
                  ? HIGHLIGHT_COLOR // Highlight color when selected
                  : BUILDING_POLYGON_COLORS.fillColor
              }
              strokeColor={
                selectedBuilding === building.id
                  ? '#2196F3'
                  : BUILDING_POLYGON_COLORS.strokeColor
              }
              strokeWidth={BUILDING_POLYGON_COLORS.strokeWidth}
              tappable
              onPress={() => handleBuildingSelect(building.id, building)}
            />
          </React.Fragment>
        );
      }),
    [selectedBuilding]
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
      <CampusToggle
        selectedCampus={campusKey}
        onCampusChange={setCampusKey}
      />
      <BuildingModal
        visible={!!selectedBuilding}
        building={selectedBuildingData}
        onClose={handleCloseModal}
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
  calloutContainer: {
    minWidth: 150,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#666',
  },
});
