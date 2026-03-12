import React, { useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useNavigationCamera } from "../../hooks/useNavigationCamera";
import MapView, { Region } from "react-native-maps";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { CAMPUSES, DEFAULT_CAMPUS } from "../../constants/campusLocations";
import { useLocationPermissions } from "../../hooks/useLocationPermissions";
import { useWatchLocation } from "../../hooks/useWatchLocation";
import { useUserBuilding } from "../../hooks/useUserBuilding";
import { getInteriorPoint } from "../../utils/geometry";
import sgwBuildingsData from "../../data/buildings/sgw.json";
import loyolaBuildingsData from "../../data/buildings/loyola.json";
import CampusToggle from "../../components/campusToggle";
import BuildingModal from "../../components/buildingModal";
import ShuttleScheduleModal from "../../components/shuttleScheduleModal";
import SearchBar from "@/components/searchBar";
import { BuildingChoice } from "@/constants/searchBar.types";
import NavigationSteps from "../../components/NavigationSteps";
import { styles } from "@/styles/index.styles";
import { DEV_OVERRIDE_LOCATION } from "../../utils/devConfig";
import { useNextClass } from "../../hooks/useNextClass";
import NextClassModal from "../../components/NextClassModal";
import { useRouting } from "../../hooks/useRouting";
import RouteOverlay from "../../components/RouteOverlay";
import BuildingLayer from "../../components/BuildingLayer";
import ShuttleStopMarkers from "../../components/ShuttleStopMarkers";

const LABEL_ZOOM_THRESHOLD = 0.015;

/** All buildings from both campuses as search choices — static, computed once. */
const buildingChoices: BuildingChoice[] = (() => {
  const toChoices = (features: any[], campus: "SGW" | "Loyola") =>
    features.map((b: any) => ({
      id: b.id,
      name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
      code: b.properties?.code,
      coordinate: getInteriorPoint(b.geometry.coordinates[0]),
      campus,
    }));
  return [
    ...toChoices(sgwBuildingsData.features, "SGW"),
    ...toChoices(loyolaBuildingsData.features, "Loyola"),
  ];
})();

export default function Index() {
  const { colorScheme } = useTheme();

  const [campusKey, setCampusKey] = useState<string>(DEFAULT_CAMPUS);
  const [showLabels, setShowLabels] = useState(
    CAMPUSES[DEFAULT_CAMPUS].initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<any>(null);
  const [showShuttleModal, setShowShuttleModal] = useState(false);

  const campusBuildingsData = useMemo(
    () => campusKey === "SGW" ? sgwBuildingsData.features : loyolaBuildingsData.features,
    [campusKey]
  );

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

  const routing = useRouting({ effectiveLocation, userBuilding, campusKey });
  const {
    directionsState,
    apiKey,
    onRouteReady,
    nextStep,
    prevStep,
    checkProgress,
    setTransportMode,
    previewRouteInfo,
    startDirectionsToBuilding,
    startChoice,
    destChoice,
    setStartChoice,
    setDestChoice,
    useShuttle,
    setUseShuttle,
    setShuttleCampus,
    shuttleWaypoints,
    effectiveMode,
    handleEndDirections,
    handleStartRoute,
    handleNextClassDirections,
    handlePreviewRoute,
    handleRoutePreviewReady,
    handleShowShuttleRoute,
    handleDirectionsFrom,
    handleDirectionsTo,
    handleLeg1Error,
    handleLeg2Error,
    handleLeg3Error,
  } = routing;

  // fetchTrigger is incremented every time the home screen gains focus so that
  // the next class data is refreshed when the user returns from Settings after
  // selecting a different calendar.
  const [fetchTrigger, setFetchTrigger] = useState(0);
  useFocusEffect(useCallback(() => { setFetchTrigger((n) => n + 1); }, []));
  const { nextClass, status: nextClassStatus, isLoading: nextClassLoading } =
    useNextClass(effectiveLocation, fetchTrigger, userBuilding?.code);

  const selectedCampus = useMemo(
    () => CAMPUSES[campusKey] ?? CAMPUSES[DEFAULT_CAMPUS],
    [campusKey]
  );

  const { mapRef, handleRouteReady } = useNavigationCamera({
    directionsState,
    location: effectiveLocation,
    selectedCampus,
    onRouteReady,
    checkProgress,
  });

  const handleActiveRouteReady = useCallback((result: any) => {
    handleRoutePreviewReady(result);
    handleRouteReady(result);
  }, [handleRoutePreviewReady, handleRouteReady]);

  const handleActiveRouteError = useCallback((error: any) => {
    console.error("[Index] MapViewDirections ERROR:", error);
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    setShowLabels(region.latitudeDelta <= LABEL_ZOOM_THRESHOLD);
  }, []);

  const handleBuildingSelect = useCallback((buildingId: string, buildingData: any) => {
    setSelectedBuilding(buildingId);
    setSelectedBuildingData(buildingData);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedBuilding(null);
    setSelectedBuildingData(null);
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={selectedCampus.initialRegion}
        userInterfaceStyle={colorScheme}
        showsUserLocation
        onRegionChangeComplete={handleRegionChange}
      >
        <BuildingLayer
          buildings={campusBuildingsData}
          selectedBuildingId={selectedBuilding}
          userBuildingId={userBuilding?.id ?? null}
          showLabels={showLabels}
          onBuildingSelect={handleBuildingSelect}
        />

        <ShuttleStopMarkers />

        <RouteOverlay
          directionsState={directionsState}
          startChoice={startChoice}
          destChoice={destChoice}
          effectiveLocation={effectiveLocation}
          useShuttle={useShuttle}
          shuttleWaypoints={shuttleWaypoints}
          effectiveMode={effectiveMode}
          apiKey={apiKey}
          campusKey={campusKey}
          onActiveRouteReady={handleActiveRouteReady}
          onActiveRouteError={handleActiveRouteError}
          onRoutePreviewReady={handleRoutePreviewReady}
          onRouteReady={handleRouteReady}
          onLeg1Error={handleLeg1Error}
          onLeg2Error={handleLeg2Error}
          onLeg3Error={handleLeg3Error}
        />
      </MapView>

      {!directionsState.isActive && (
        <>
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

          <NextClassModal
            nextClass={nextClass}
            status={nextClassStatus}
            isLoading={nextClassLoading}
            onGetDirections={handleNextClassDirections}
          />

          <CampusToggle selectedCampus={campusKey} onCampusChange={setCampusKey} />
        </>
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
          if (effectiveLocation) {
            startDirectionsToBuilding(effectiveLocation, building.geometry.coordinates[0]);
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
