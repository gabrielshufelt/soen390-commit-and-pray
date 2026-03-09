import React, { useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
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
import SearchBar from "@/components/searchBar";
import { BuildingChoice } from "@/constants/searchBar.types";
import NavigationSteps from "../../components/NavigationSteps";
import { HIGHLIGHT_COLOR, STROKE_COLOR } from "@/styles/index.styles";
import { DEV_OVERRIDE_LOCATION } from "../../utils/devConfig";
import { useNextClass } from "../../hooks/useNextClass";
import { getRouteLineStyle } from "../../constants/routeStyles";
import NextClassModal from "../../components/NextClassModal";
import { getBuildingCoordinate } from "../../utils/buildingCoordinates";

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

  // START DEVELOPPER CONFIG
  // When DEV_OVERRIDE_LOCATION is set in utils/devConfig.ts, the app uses those
  // coordinates instead of real GPS everywhere (building detection, walking time,
  // navigation start).  Set it to null in devConfig.ts to use real GPS.
  const effectiveLocation: Location.LocationObject | null = DEV_OVERRIDE_LOCATION
    ? ({
      coords: {
        latitude: DEV_OVERRIDE_LOCATION.latitude,
        longitude: DEV_OVERRIDE_LOCATION.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as unknown as Location.LocationObject)
    : location; // DO NOT CHANGE AS IT WILL CRASH IF DEV_OVERRIDE_LOCATION IS NULL
  // END DEVELOPPER CONFIG

  const userBuilding = useUserBuilding(effectiveLocation);

  const currentCampus = useMemo(() => {
    if (!effectiveLocation) return undefined;
    return findCampusForCoordinate(effectiveLocation.coords.latitude, effectiveLocation.coords.longitude);
  }, [effectiveLocation]);

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

  // fetchTrigger is incremented every time the home screen gains focus so that
  // the next class data is refreshed when the user returns from Settings after
  // selecting a different calendar.
  const [fetchTrigger, setFetchTrigger] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFetchTrigger((n) => n + 1);
    }, [])
  );
  const {
    nextClass,
    status: nextClassStatus,
    isLoading: nextClassLoading,
  } = useNextClass(effectiveLocation, fetchTrigger, userBuilding?.code);

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
    if (!destChoice || !effectiveLocation) return;

    startDirections({ latitude: effectiveLocation.coords.latitude, longitude: effectiveLocation.coords.longitude }, destChoice.coordinate);
  };

  const handleNextClassDirections = (buildingCode: string) => {
    if (!effectiveLocation) return;

    const buildingCoord = getBuildingCoordinate(buildingCode);
    if (buildingCoord) {
      startDirections(
        { latitude: effectiveLocation.coords.latitude, longitude: effectiveLocation.coords.longitude },
        buildingCoord
      );
    } else {
      Alert.alert("Error", "Could not find coordinates for this building.");
    }
  };

  const handlePreviewRoute = () => {
    if (!destChoice || !startChoice || startChoice.id === "current-location") return;

    if (startChoice.id == destChoice.id) {
      Alert.alert("Start and destination cannot be the same building.");
      return;
    }

    previewDirections(startChoice?.coordinate, destChoice?.coordinate);
  }

  const handleRoutePreviewReady = useCallback((result: any) => {
    setPreviewRouteInfo({
      distance: result.distance,
      duration: result.duration,
      distanceText: result.distance ? `${result.distance.toFixed(1)} km` : null,
      durationText: result.duration ? `${Math.round(result.duration)} min` : null,
    });
  }, [setPreviewRouteInfo]);

  const handleShowShuttleRoute = () => {
    const loyolaStop = shuttleData.busStops.loyola.coordinate;
    const sgwStop = shuttleData.busStops.sgw.coordinate;

    startDirections(loyolaStop, sgwStop);
  };


  const handleRegionChange = useCallback((region: Region) => {
    setShowLabels(region.latitudeDelta <= LABEL_ZOOM_THRESHOLD);
  }, []);

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
    location: effectiveLocation,
    selectedCampus,
    onRouteReady,
    checkProgress,
  });

  // Stable callbacks for MapViewDirections — prevents re-renders when
  // unrelated state (e.g. showLabels) changes, which is the root cause of
  // the route polyline disappearing on zoom-out.
  const handleActiveRouteReady = useCallback((result: any) => {
    handleRoutePreviewReady(result);
    handleRouteReady(result);
  }, [handleRoutePreviewReady, handleRouteReady]);

  const handleActiveRouteError = useCallback((error: any) => {
    console.error("[Index] MapViewDirections ERROR:", error);
  }, []);

  const handleLeg1Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg1 ERROR:", error);
  }, []);

  const handleLeg2Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg2 ERROR:", error);
  }, []);

  const handleLeg3Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg3 ERROR:", error);
  }, []);

  React.useEffect(() => {
    if (!startChoice && effectiveLocation) {
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
            latitude: effectiveLocation.coords.latitude,
            longitude: effectiveLocation.coords.longitude,
          },
          campus: (currentCampus?.campus.name as any) ?? campusKey,
        });
      }
    }
  }, [effectiveLocation, userBuilding, startChoice, campusKey]);


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

  // Memoised route overlays — isolated from showLabels / buildingPolygons
  // re-renders so the native Polyline is never torn down during a zoom change.
  const activeRouteElement = useMemo(() => {
    if (!directionsState.isActive || !directionsState.origin || !directionsState.destination) {
      return null;
    }
    if (useShuttle && shuttleWaypoints) {
      return (
        <React.Fragment>
          {/* Leg 1: origin → shuttle departure stop */}
          <MapViewDirections
            key={`active-leg1-${directionsState.origin.latitude}-${shuttleWaypoints[0].latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={directionsState.origin}
            destination={shuttleWaypoints[0]}
            apikey={apiKey}
            mode={directionsState.transportMode}
            {...getRouteLineStyle(directionsState.transportMode)}
            onReady={handleRouteReady}
            onError={handleLeg1Error}
          />
          {/* Leg 2: shuttle departure stop → arrival stop (shuttle bus) */}
          <MapViewDirections
            key={`active-leg2-${shuttleWaypoints[0].latitude}-${shuttleWaypoints[1].latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[0]}
            destination={shuttleWaypoints[1]}
            apikey={apiKey}
            mode="DRIVING"
            {...getRouteLineStyle('SHUTTLE')}
            onError={handleLeg2Error}
          />
          {/* Leg 3: shuttle arrival stop → destination */}
          <MapViewDirections
            key={`active-leg3-${shuttleWaypoints[1].latitude}-${directionsState.destination.latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[1]}
            destination={directionsState.destination}
            apikey={apiKey}
            mode={directionsState.transportMode}
            {...getRouteLineStyle(directionsState.transportMode)}
            onError={handleLeg3Error}
          />
        </React.Fragment>
      );
    }
    return (
      <MapViewDirections
        key={`${campusKey}-${directionsState.origin?.latitude ?? "x"}-${directionsState.destination?.latitude ?? "y"}-${effectiveMode}`}
        origin={directionsState.origin}
        destination={directionsState.destination}
        apikey={apiKey}
        mode={effectiveMode}
        {...getRouteLineStyle(effectiveMode)}
        onReady={handleActiveRouteReady}
        onError={handleActiveRouteError}
      />
    );
  }, [
    directionsState.isActive, directionsState.origin, directionsState.destination,
    directionsState.transportMode, useShuttle, shuttleWaypoints, campusKey,
    apiKey, effectiveMode, handleRouteReady, handleActiveRouteReady,
    handleActiveRouteError, handleLeg1Error, handleLeg2Error, handleLeg3Error,
  ]);

  const previewRouteElement = useMemo(() => {
    if (directionsState.isActive || !destChoice) return null;
    if (!startChoice && !effectiveLocation) return null;

    if (useShuttle && shuttleWaypoints) {
      const origin = startChoice?.coordinate || { latitude: effectiveLocation!.coords.latitude, longitude: effectiveLocation!.coords.longitude };
      return (
        <React.Fragment>
          {/* Leg 1: origin → shuttle departure stop */}
          <MapViewDirections
            key={`preview-leg1-${(startChoice?.coordinate.latitude || effectiveLocation?.coords.latitude) ?? "x"}-${shuttleWaypoints[0].latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={origin}
            destination={shuttleWaypoints[0]}
            apikey={apiKey}
            mode={directionsState.transportMode}
            {...getRouteLineStyle(directionsState.transportMode)}
            onReady={handleRoutePreviewReady}
          />
          {/* Leg 2: shuttle departure stop → arrival stop (shuttle bus) */}
          <MapViewDirections
            key={`preview-leg2-${shuttleWaypoints[0].latitude}-${shuttleWaypoints[1].latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[0]}
            destination={shuttleWaypoints[1]}
            apikey={apiKey}
            mode="DRIVING"
            {...getRouteLineStyle('SHUTTLE')}
            onReady={handleRoutePreviewReady}
          />
          {/* Leg 3: shuttle arrival stop → destination */}
          <MapViewDirections
            key={`preview-leg3-${shuttleWaypoints[1].latitude}-${destChoice.coordinate.latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[1]}
            destination={destChoice.coordinate}
            apikey={apiKey}
            mode={directionsState.transportMode}
            {...getRouteLineStyle(directionsState.transportMode)}
            onReady={handleRoutePreviewReady}
          />
        </React.Fragment>
      );
    }

    const origin = startChoice?.coordinate || { latitude: effectiveLocation!.coords.latitude, longitude: effectiveLocation!.coords.longitude };
    return (
      <MapViewDirections
        key={`preview-${(startChoice?.coordinate.latitude || effectiveLocation?.coords.latitude) ?? "x"}-${destChoice.coordinate.latitude}-${effectiveMode}`}
        origin={origin}
        destination={destChoice.coordinate}
        apikey={apiKey}
        mode={effectiveMode}
        {...getRouteLineStyle(effectiveMode)}
        onReady={handleRoutePreviewReady}
      />
    );
  }, [
    directionsState.isActive, directionsState.transportMode, destChoice,
    startChoice, effectiveLocation, useShuttle, shuttleWaypoints,
    apiKey, effectiveMode, handleRoutePreviewReady,
  ]);

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

        {activeRouteElement}
        {previewRouteElement}
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

      {!directionsState.isActive && (
        <NextClassModal
          nextClass={nextClass}
          status={nextClassStatus}
          isLoading={nextClassLoading}
          onGetDirections={handleNextClassDirections}
        />
      )}

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
          if (location) {
            startDirectionsToBuilding(location, building.geometry.coordinates[0]);
          }
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
