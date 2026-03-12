import { useState, useCallback, useMemo, useEffect } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { useDirections, Coordinates, DirectionsState } from "./useDirections";
import { BuildingChoice } from "../constants/searchBar.types";
import { MatchedBuilding } from "./useUserBuilding";
import { getInteriorPoint } from "../utils/geometry";
import { findCampusForCoordinate } from "../constants/campusLocations";
import { getBuildingCoordinate } from "../utils/buildingCoordinates";
import shuttleData from "../data/shuttleSchedule.json";
import type { MapViewDirectionsMode } from "react-native-maps-directions";

interface UseRoutingParams {
  effectiveLocation: Location.LocationObject | null;
  userBuilding: MatchedBuilding | null;
  campusKey: string;
}

export function useRouting({ effectiveLocation, userBuilding, campusKey }: UseRoutingParams) {
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

  const [startChoice, setStartChoice] = useState<BuildingChoice | null>(null);
  const [destChoice, setDestChoice] = useState<BuildingChoice | null>(null);
  const [useShuttle, setUseShuttle] = useState(false);
  const [shuttleCampus, setShuttleCampus] = useState<"SGW" | "Loyola">("SGW");

  const shuttleWaypoints = useMemo(() => {
    if (!useShuttle) return undefined;
    const { loyola, sgw } = shuttleData.busStops;
    return shuttleCampus === "SGW"
      ? [sgw.coordinate, loyola.coordinate]   // SGW → Loyola
      : [loyola.coordinate, sgw.coordinate];  // Loyola → SGW
  }, [useShuttle, shuttleCampus]);

  const effectiveMode: MapViewDirectionsMode = useShuttle ? "DRIVING" : directionsState.transportMode;

  useEffect(() => {
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
        const currentCampus = findCampusForCoordinate(
          effectiveLocation.coords.latitude,
          effectiveLocation.coords.longitude
        );
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

  const handleEndDirections = useCallback(() => {
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
  }, [endDirections, setPreviewRouteInfo]);

  const handleStartRoute = useCallback(() => {
    if (!destChoice || !effectiveLocation) return;
    startDirections(
      { latitude: effectiveLocation.coords.latitude, longitude: effectiveLocation.coords.longitude },
      destChoice.coordinate
    );
  }, [destChoice, effectiveLocation, startDirections]);

  const handleNextClassDirections = useCallback((buildingCode: string) => {
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
  }, [effectiveLocation, startDirections]);

  const handlePreviewRoute = useCallback(() => {
    if (!destChoice || !startChoice || startChoice.id === "current-location") return;
    if (startChoice.id === destChoice.id) {
      Alert.alert("Start and destination cannot be the same building.");
      return;
    }
    previewDirections(startChoice.coordinate, destChoice.coordinate);
  }, [destChoice, startChoice, previewDirections]);

  const handleRoutePreviewReady = useCallback((result: any) => {
    setPreviewRouteInfo({
      distance: result.distance,
      duration: result.duration,
      distanceText: result.distance ? `${result.distance.toFixed(1)} km` : null,
      durationText: result.duration ? `${Math.round(result.duration)} min` : null,
    });
  }, [setPreviewRouteInfo]);

  const handleShowShuttleRoute = useCallback(() => {
    const loyolaStop = shuttleData.busStops.loyola.coordinate;
    const sgwStop = shuttleData.busStops.sgw.coordinate;
    startDirections(loyolaStop, sgwStop);
  }, [startDirections]);

  const buildingToChoice = useCallback((b: any): BuildingChoice => ({
    id: b.id,
    name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
    code: b.properties?.code,
    coordinate: getInteriorPoint(b.geometry.coordinates[0]),
    campus: campusKey as "SGW" | "Loyola",
  }), [campusKey]);

  const handleDirectionsFrom = useCallback((building: any) => {
    setStartChoice(buildingToChoice(building));
  }, [buildingToChoice]);

  const handleDirectionsTo = useCallback((building: any) => {
    setDestChoice(buildingToChoice(building));
  }, [buildingToChoice]);

  const handleLeg1Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg1 ERROR:", error);
  }, []);

  const handleLeg2Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg2 ERROR:", error);
  }, []);

  const handleLeg3Error = useCallback((error: any) => {
    console.error("[Index] MapViewDirections leg3 ERROR:", error);
  }, []);

  return {
    // State
    startChoice,
    destChoice,
    setStartChoice,
    setDestChoice,
    useShuttle,
    setUseShuttle,
    shuttleCampus,
    setShuttleCampus,
    shuttleWaypoints,
    effectiveMode,

    // From useDirections (re-exported)
    directionsState,
    apiKey,
    onRouteReady,
    nextStep,
    prevStep,
    checkProgress,
    setTransportMode,
    previewRouteInfo,
    startDirectionsToBuilding,

    // Handlers
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
  };
}
