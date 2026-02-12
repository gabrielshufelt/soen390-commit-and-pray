import React, { useMemo, useRef, useEffect, useState } from "react";
import MapView, { Marker, Polygon, Region } from "react-native-maps";
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { CAMPUSES, DEFAULT_CAMPUS, findCampusForCoordinate } from "../../constants/campusLocations";
import { BUILDING_POLYGON_COLORS } from "../../constants/mapColors";
import { useLocationPermissions } from "../../hooks/useLocationPermissions";
import { useWatchLocation } from "../../hooks/useWatchLocation";
import { useUserBuilding } from "../../hooks/useUserBuilding";
import { getInteriorPoint } from "../../utils/geometry";
import sgwBuildingsData from "../../data/buildings/sgw.json";
import loyolaBuildingsData from "../../data/buildings/loyola.json";
import CampusToggle from "../../components/campusToggle";
import BuildingModal from "../../components/buildingModal";
import { useDirections } from "../../hooks/useDirections";
import MapViewDirections from "react-native-maps-directions";
import SearchBar, { BuildingChoice } from "../../components/searchBar";

// Constants for colors
const HIGHLIGHT_COLOR = "rgba(33, 150, 243, 0.4)";
const STROKE_COLOR = "#2196F3";
const BLACK = "rgba(0, 0, 0, 0.75)";
const GREY = "#666";

const LABEL_ZOOM_THRESHOLD = 0.015;
const ANCHOR_OFFSET = { x: 0.5, y: 0.5 };
const ANIMATION_DURATION = 600;

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const defaultCampus = CAMPUSES[DEFAULT_CAMPUS];
  const [campusKey, setCampusKey] = useState<string>(DEFAULT_CAMPUS);

  const campusBuildingsData = useMemo(() => {
    return campusKey === "SGW" ? sgwBuildingsData.features : loyolaBuildingsData.features;
  }, [campusKey]);

  const permissionState = useLocationPermissions();
  const { location } = useWatchLocation({ enabled: permissionState.granted });
  const userBuilding = useUserBuilding(location);

  const currentCampus = useMemo(() => {
    if (!location) return undefined;
    return findCampusForCoordinate(location.coords.latitude, location.coords.longitude);
  }, [location]);

  const { state: directionsState, apiKey, startDirectionsToBuilding, onRouteReady, endDirections } =
    useDirections();

  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );

  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<any>(null);

  const [startChoice, setStartChoice] = useState<BuildingChoice | null>(null);
  const [destChoice, setDestChoice] = useState<BuildingChoice | null>(null);

  const handleEndDirections = () => {
    endDirections();
    setStartChoice(null);
    setDestChoice(null);
  };


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
  }, [campusKey]);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(selectedCampus.initialRegion, ANIMATION_DURATION);
  }, [selectedCampus]);

  const buildingPolygons = useMemo(() => {
    return campusBuildingsData.map((building: any) => {
      const isSelected = selectedBuilding === building.id;
      const isUserInside = userBuilding?.id === building.id;

      return (
        <React.Fragment key={building.id}>
          <Polygon
            coordinates={building.geometry.coordinates[0].map(([longitude, latitude]: [number, number]) => ({
              latitude,
              longitude,
            }))}
            fillColor={isSelected || isUserInside ? HIGHLIGHT_COLOR : BUILDING_POLYGON_COLORS.fillColor}
            strokeColor={isSelected || isUserInside ? STROKE_COLOR : BUILDING_POLYGON_COLORS.strokeColor}
            strokeWidth={BUILDING_POLYGON_COLORS.strokeWidth}
            tappable
            onPress={() => handleBuildingSelect(building.id, building)}
          />
        </React.Fragment>
      );
    });
  }, [campusBuildingsData, selectedBuilding, userBuilding]);

  const buildingLabels = useMemo(() => {
    return campusBuildingsData
      .filter((b: any) => (b.properties as { code?: string })?.code)
      .map((building: any) => {
        const centroid = getInteriorPoint(building.geometry.coordinates[0]);
        const code = (building.properties as { code: string }).code;

        return (
          <Marker key={`label-${building.id}`} coordinate={centroid} anchor={ANCHOR_OFFSET} tracksViewChanges={false}>
            <View style={styles.labelContainer}>
              <Text style={styles.buildingLabel}>{code}</Text>
            </View>
          </Marker>
        );
      });
  }, [campusBuildingsData]);

  const buildingChoices: BuildingChoice[] = useMemo(() => {
    return campusBuildingsData.map((b: any) => ({
      id: b.id,
      name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
      code: b.properties?.code,
      coordinate: getInteriorPoint(b.geometry.coordinates[0]),
    }));
  }, [campusBuildingsData]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={selectedCampus.initialRegion}
        userInterfaceStyle={isDark ? "dark" : "light"}
        showsUserLocation
        onRegionChangeComplete={handleRegionChange}
      >
        {buildingPolygons}
        {showLabels && buildingLabels}

        {directionsState.isActive && directionsState.origin && directionsState.destination && (
          <MapViewDirections
            origin={directionsState.origin}
            destination={directionsState.destination}
            apikey={apiKey}
            strokeWidth={5}
            strokeColor="#0A84FF"
            onReady={(result) => {
              onRouteReady(result);
              if (result?.coordinates?.length) {
                mapRef.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: { top: 160, right: 50, bottom: 220, left: 50 },
                  animated: true,
                });
              }
            }}
            onError={(error) => console.error("[Index] MapViewDirections ERROR:", error)}
          />
        )}
      </MapView>



      <SearchBar
        buildings={buildingChoices}
        start={startChoice}
        destination={destChoice}
        onChangeStart={setStartChoice}
        onChangeDestination={setDestChoice}
        routeActive={directionsState.isActive}
        onEndRoute={handleEndDirections}
      />


      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Current Location</Text>
        <Text style={styles.overlayValue}>
          {permissionState.granted ? currentCampus?.campus.name ?? "Outside campus boundaries" : "Location permission required"}
        </Text>

        {userBuilding && <Text style={styles.overlayBuilding}>📍 Inside: {userBuilding.name}</Text>}
      </View>

      <CampusToggle selectedCampus={campusKey} onCampusChange={setCampusKey} />

      <BuildingModal
        visible={!!selectedBuilding}
        building={selectedBuildingData}
        onClose={handleCloseModal}
        location={location}
        onGetDirections={startDirectionsToBuilding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  map: { width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  overlayTitle: {
    color: "#9ca3af",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  overlayBuilding: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  overlayValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },

  labelContainer: { backgroundColor: "transparent" },
  buildingLabel: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    textShadowColor: BLACK,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  _unusedGrey: { color: GREY },
});
