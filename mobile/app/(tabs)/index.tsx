import React, { useMemo, useState } from "react";
import { useNavigationCamera } from "../../hooks/useNavigationCamera";
import MapView, { Marker, Polygon, Region } from "react-native-maps";
import { Alert, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { CAMPUSES, DEFAULT_CAMPUS, findCampusForCoordinate } from "../../constants/campusLocations";
import { BUILDING_POLYGON_COLORS } from "../../constants/mapColors";
import { useLocationPermissions } from "../../hooks/useLocationPermissions";
import { useWatchLocation } from "../../hooks/useWatchLocation";
import { useUserBuilding } from "../../hooks/useUserBuilding";
import { getInteriorPoint } from "../../utils/geometry";
import sgwBuildingsData from "../../data/buildings/sgw.json";
import loyolaBuildingsData from "../../data/buildings/loyola.json";
import shuttleData from "../../data/shuttleSchedule.json";
import CampusToggle from "../../components/campusToggle";
import BuildingModal from "../../components/buildingModal";
import ShuttleScheduleModal from "../../components/shuttleScheduleModal";
import { useDirections } from "../../hooks/useDirections";
import MapViewDirections from "react-native-maps-directions";
import SearchBar, { BuildingChoice } from "../../components/searchBar";
import NavigationSteps from "../../components/NavigationSteps";
import { HIGHLIGHT_COLOR, STROKE_COLOR } from "@/styles/index.styles";

const LABEL_ZOOM_THRESHOLD = 0.015;
const ANCHOR_OFFSET = { x: 0.5, y: 0.5 };

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

  const {
    state: directionsState,
    apiKey,
    startDirections,
    previewDirections,
    startDirectionsToBuilding,
    onRouteReady,
    endDirections,
    nextStep,
    prevStep,
    checkProgress,
    setTransportMode,
    previewRouteInfo,
    setPreviewRouteInfo,
  } = useDirections();

  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );

  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<any>(null);

  const [startChoice, setStartChoice] = useState<BuildingChoice | null>(null);
  const [destChoice, setDestChoice] = useState<BuildingChoice | null>(null);
  const [showShuttleModal, setShowShuttleModal] = useState(false);

  // Concordia Shuttle option
  const [useShuttle, setUseShuttle] = useState(false);
  const [shuttleCampus, setShuttleCampus] = useState<"SGW" | "Loyola">("SGW");

  /**
   * Waypoints to inject into MapViewDirections when the shuttle option is
   * selected.  The route becomes:
   *   user/start → shuttle stop (departure campus) → shuttle stop (arrival campus) → destination
   */
  const shuttleWaypoints = useMemo(() => {
    if (!useShuttle) return undefined;
    const { loyola, sgw } = shuttleData.busStops;
    return shuttleCampus === "SGW"
      ? [sgw.coordinate, loyola.coordinate]   // SGW → Loyola
      : [loyola.coordinate, sgw.coordinate];  // Loyola → SGW
  }, [useShuttle, shuttleCampus]);

  /** Effective transport mode: shuttle always drives between stops. */
  const effectiveMode = useShuttle ? "DRIVING" : directionsState.transportMode;

  const handleEndDirections = () => {
    endDirections();
    setStartChoice(null);
    setDestChoice(null);
    setUseShuttle(false);
    setPreviewRouteInfo({
      distance: null,
      duration: null,
      distanceText: null,
      durationText: null,
    });
  };

  const handleStartRoute = () => {
    if (!destChoice || !location) return;

    startDirections({ latitude: location.coords.latitude, longitude: location.coords.longitude }, destChoice.coordinate);
  };

  const handlePreviewRoute = () => {
    if (!destChoice || !startChoice || startChoice.id === "current-location") return;

    if (startChoice.id == destChoice.id) {
      Alert.alert("Start and destination cannot be the same building.");
      return;
    }

    previewDirections(startChoice?.coordinate, destChoice?.coordinate);
  }

  const handleRoutePreviewReady = (result: any) => {
    setPreviewRouteInfo({
      distance: result.distance,
      duration: result.duration,
      distanceText: result.distance ? `${result.distance.toFixed(1)} km` : null,
      durationText: result.duration ? `${Math.round(result.duration)} min` : null,
    });
  };
  const handleShowShuttleRoute = () => {
    const loyolaStop = shuttleData.busStops.loyola.coordinate;
    const sgwStop = shuttleData.busStops.sgw.coordinate;
    
    startDirections(loyolaStop, sgwStop);
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

  const buildingToChoice = (b: any): BuildingChoice => ({
    id: b.id,
    name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
    code: b.properties?.code,
    coordinate: getInteriorPoint(b.geometry.coordinates[0]),
    campus: campusKey as "SGW" | "Loyola",
  });

  const handleDirectionsFrom = (building: any) => {
    setStartChoice(buildingToChoice(building));
  };

  const handleDirectionsTo = (building: any) => {
    setDestChoice(buildingToChoice(building));
  };

  const selectedCampus = useMemo(() => {
    return CAMPUSES[campusKey] ?? CAMPUSES[DEFAULT_CAMPUS];
  }, [campusKey]);

  const { mapRef, handleRouteReady } = useNavigationCamera({
    directionsState,
    location,
    selectedCampus,
    onRouteReady,
    checkProgress,
  });

  React.useEffect(() => {
    if (!startChoice && location) {
      if (userBuilding) {
        setStartChoice({
          id: userBuilding.id,
          name: userBuilding.name || userBuilding.code || "Unknown Building",
          code: userBuilding.code,
          coordinate: getInteriorPoint(userBuilding.coordinates),
          campus: campusKey as "SGW" | "Loyola",
        });
      } else {
        setStartChoice({
          id: "current-location",
          name: "My Current Location",
          coordinate: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          campus: (currentCampus?.campus.name as any) ?? campusKey,
        });
      }
    }
  }, [location, userBuilding, startChoice, campusKey]);


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
          <React.Fragment key={building.id}>
            <Polygon
              testID={`building-${building.id}`}
              coordinates={building.geometry.coordinates[0].map(
                ([longitude, latitude]: [number, number]) => ({
                  latitude,
                  longitude,
                })
              )}
              fillColor={
                selectedBuilding === building.id
                  ? HIGHLIGHT_COLOR
                  : BUILDING_POLYGON_COLORS.fillColor
              }
              strokeColor={
                selectedBuilding === building.id
                  ? STROKE_COLOR
                  : BUILDING_POLYGON_COLORS.strokeColor
              }
              strokeWidth={BUILDING_POLYGON_COLORS.strokeWidth}
              tappable
              onPress={() => handleBuildingSelect(building.id, building)}
            />
            <Marker key={`label-${building.id}`} coordinate={centroid} anchor={ANCHOR_OFFSET} tracksViewChanges={false}>
              <View style={styles.labelContainer}>
                <Text style={styles.buildingLabel}>{code}</Text>
              </View>
            </Marker>
          </React.Fragment>
        );
      });
  }, [campusBuildingsData]);

  const buildingChoices: BuildingChoice[] = useMemo(() => {
    const toChoices = (features: any[], campus: "SGW" | "Loyola") =>
      features.map((b: any) => ({
        id: b.id,
        name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
        code: b.properties?.code,
        coordinate: getInteriorPoint(b.geometry.coordinates[0]),
        campus,
      }));

    return [...toChoices(sgwBuildingsData.features, "SGW"), ...toChoices(loyolaBuildingsData.features, "Loyola")];
  }, []);

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

        {/* Shuttle Bus Stops */}
        <Marker
          testID="shuttle-stop-marker"
          coordinate={shuttleData.busStops.loyola.coordinate}
          title="Loyola Shuttle Stop"
          description={shuttleData.busStops.loyola.address}
          anchor={ANCHOR_OFFSET}
          tracksViewChanges={false}
          zIndex={1000}
        >
          <View style={styles.busStopMarker}>
            <Text style={styles.busStopIcon}>🚏</Text>
          </View>
        </Marker>

        <Marker
          testID="shuttle-stop-marker"
          coordinate={shuttleData.busStops.sgw.coordinate}
          title="SGW Shuttle Stop"
          description={shuttleData.busStops.sgw.address}
          anchor={ANCHOR_OFFSET}
          tracksViewChanges={false}
          zIndex={1000}
        >
          <View style={styles.busStopMarker}>
            <Text style={styles.busStopIcon}>🚏</Text>
          </View>
        </Marker>

        {directionsState.isActive && directionsState.origin && directionsState.destination && (
          useShuttle && shuttleWaypoints ? (
            <React.Fragment>
              {/* Leg 1: origin → shuttle departure stop */}
              <MapViewDirections
                key={`active-leg1-${directionsState.origin.latitude}-${shuttleWaypoints[0].latitude}-${useShuttle}`}
                origin={directionsState.origin}
                destination={shuttleWaypoints[0]}
                apikey={apiKey}
                mode={directionsState.transportMode}
                strokeWidth={5}
                strokeColor="#0A84FF"
                onReady={handleRouteReady}
                onError={(error) => console.error("[Index] MapViewDirections leg1 ERROR:", error)}
              />
              {/* Leg 2: shuttle departure stop → arrival stop (red = shuttle bus) */}
              <MapViewDirections
                key={`active-leg2-${shuttleWaypoints[0].latitude}-${shuttleWaypoints[1].latitude}-${useShuttle}`}
                origin={shuttleWaypoints[0]}
                destination={shuttleWaypoints[1]}
                apikey={apiKey}
                mode="DRIVING"
                strokeWidth={5}
                strokeColor="#D32F2F"
                onError={(error) => console.error("[Index] MapViewDirections leg2 ERROR:", error)}
              />
              {/* Leg 3: shuttle arrival stop → destination */}
              <MapViewDirections
                key={`active-leg3-${shuttleWaypoints[1].latitude}-${directionsState.destination.latitude}-${useShuttle}`}
                origin={shuttleWaypoints[1]}
                destination={directionsState.destination}
                apikey={apiKey}
                mode={directionsState.transportMode}
                strokeWidth={5}
                strokeColor="#0A84FF"
                onError={(error) => console.error("[Index] MapViewDirections leg3 ERROR:", error)}
              />
            </React.Fragment>
          ) : (
            <MapViewDirections
              key={`${campusKey}-${directionsState.origin?.latitude ?? "x"}-${directionsState.destination?.latitude ?? "y"}-${effectiveMode}`}
              origin={directionsState.origin}
              destination={directionsState.destination}
              apikey={apiKey}
              mode={effectiveMode}
              strokeWidth={5}
              strokeColor="#0A84FF"
              onReady={handleRouteReady}
              onError={(error) => console.error("[Index] MapViewDirections ERROR:", error)}
            />
          )
        )}

        {!directionsState.isActive && destChoice && (startChoice || (location && !startChoice)) && (
          useShuttle && shuttleWaypoints ? (
            <React.Fragment>
              {/* Leg 1: origin → shuttle departure stop */}
              <MapViewDirections
                key={`preview-leg1-${(startChoice?.coordinate.latitude || location?.coords.latitude) ?? "x"}-${shuttleWaypoints[0].latitude}-${useShuttle}`}
                origin={startChoice?.coordinate || { latitude: location!.coords.latitude, longitude: location!.coords.longitude }}
                destination={shuttleWaypoints[0]}
                apikey={apiKey}
                mode={directionsState.transportMode}
                strokeWidth={3}
                strokeColor="#FFFFFFFF"
                onReady={handleRoutePreviewReady}
              />
              {/* Leg 2: shuttle departure stop → arrival stop (red = shuttle bus) */}
              <MapViewDirections
                key={`preview-leg2-${shuttleWaypoints[0].latitude}-${shuttleWaypoints[1].latitude}-${useShuttle}`}
                origin={shuttleWaypoints[0]}
                destination={shuttleWaypoints[1]}
                apikey={apiKey}
                mode="DRIVING"
                strokeWidth={3}
                strokeColor="#D32F2F"
              />
              {/* Leg 3: shuttle arrival stop → destination */}
              <MapViewDirections
                key={`preview-leg3-${shuttleWaypoints[1].latitude}-${destChoice.coordinate.latitude}-${useShuttle}`}
                origin={shuttleWaypoints[1]}
                destination={destChoice.coordinate}
                apikey={apiKey}
                mode={directionsState.transportMode}
                strokeWidth={3}
                strokeColor="#FFFFFFFF"
              />
            </React.Fragment>
          ) : (
            <MapViewDirections
              key={`preview-${(startChoice?.coordinate.latitude || location?.coords.latitude) ?? "x"}-${destChoice.coordinate.latitude}-${effectiveMode}`}
              origin={startChoice?.coordinate || { latitude: location!.coords.latitude, longitude: location!.coords.longitude }}
              destination={destChoice.coordinate}
              apikey={apiKey}
              mode={effectiveMode}
              strokeWidth={3}
              strokeColor="#FFFFFFFF"
              onReady={handleRoutePreviewReady}
            />
          )
        )}
      </MapView>

      {!directionsState.isActive && (
        <SearchBar
          buildings={buildingChoices}
          start={startChoice}
          destination={destChoice}
          onChangeStart={setStartChoice}
          onChangeDestination={setDestChoice}
          transportMode={directionsState.transportMode}
          onChangeTransportMode={setTransportMode}
          routeActive={directionsState.isActive}
          previewActive={!directionsState.isActive && !!directionsState.origin}
          onEndRoute={handleEndDirections}
          onStartRoute={handleStartRoute}
          onPreviewRoute={handlePreviewRoute}
          onExitPreview={handleEndDirections}
          previewRouteInfo={previewRouteInfo}
          useShuttle={useShuttle}
          onUseShuttleChange={setUseShuttle}
          onCampusChange={setShuttleCampus}
        />
      )}


      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Current Location</Text>
        <Text style={styles.overlayValue}>
          {permissionState.granted ? currentCampus?.campus.name ?? "Outside campus boundaries" : "Location permission required"}
        </Text>

        {userBuilding && <Text style={styles.overlayBuilding}>📍 Inside: {userBuilding.name}</Text>}
      </View>

      {!directionsState.isActive && (
        <CampusToggle selectedCampus={campusKey} onCampusChange={setCampusKey} />
      )}

      <TouchableOpacity
        style={styles.shuttleButton}
        onPress={() => setShowShuttleModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.shuttleButtonText}>🚌</Text>
      </TouchableOpacity>

      {directionsState.isActive && directionsState.steps.length > 0 && (
        <NavigationSteps
          steps={directionsState.steps}
          currentStepIndex={directionsState.currentStepIndex}
          totalDistance={directionsState.routeInfo.distanceText ?? ""}
          totalDuration={directionsState.routeInfo.durationText ?? ""}
          isOffRoute={directionsState.isOffRoute}
          onEndNavigation={handleEndDirections}
          onNextStep={nextStep}
          onPrevStep={prevStep}
        />
      )}

      <BuildingModal
        visible={!!selectedBuilding}
        building={selectedBuildingData}
        onClose={handleCloseModal}
        onDirectionsFrom={handleDirectionsFrom}
        onDirectionsTo={handleDirectionsTo}
        onGetDirections={(building) => {
          startDirectionsToBuilding(building);
          handleCloseModal();
        }}
      />

      <ShuttleScheduleModal
        visible={showShuttleModal}
        onClose={() => setShowShuttleModal(false)}
        onShowRoute={handleShowShuttleRoute}
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
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  shuttleButton: {
    position: "absolute",
    top: 140,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },

  shuttleButtonText: {
    fontSize: 28,
  },

  busStopMarker: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  busStopIcon: {
    fontSize: 24,
  },
});
