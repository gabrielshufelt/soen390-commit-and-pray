import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useNavigationCamera } from "../../hooks/useNavigationCamera";
import MapView, { Circle, Marker, Polygon, Region } from "react-native-maps";
import { Alert, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { CAMPUSES, DEFAULT_CAMPUS, findCampusForCoordinate } from "../../constants/campusLocations";
import { BUILDING_POLYGON_COLORS } from "../../constants/mapColors";
import { useLocationPermissions } from "../../hooks/useLocationPermissions";
import { useWatchLocation } from "../../hooks/useWatchLocation";
import { useUserBuilding } from "../../hooks/useUserBuilding";
import { getDistanceMeters, getInteriorPoint, isValidCoordinate } from "../../utils/geometry";
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
import { HIGHLIGHT_COLOR, STROKE_COLOR} from "@/styles/index.styles";
import { DEV_OVERRIDE_LOCATION } from "../../utils/devConfig";
import { useNextClass, type ParsedNextClass } from "../../hooks/useNextClass";
import { getRouteLineStyle } from "../../constants/routeStyles";
import NextClassModal from "../../components/NextClassModal";
import { getBuildingCoordinate } from "../../utils/buildingCoordinates";
import { buildRouteRaw } from "@/utils/buildingParser";
import IndoorMapModal from "../../components/indoorMapModal";
import { getBuildingIndoorMap, getIndoorBuildingCodes } from "@/utils/indoorMapData";
import { useCombinedNavigation } from "../../hooks/useCombinedNavigation";
import { AllCampusData } from "../../data/buildings";

const LABEL_ZOOM_THRESHOLD = 0.015;
const ANCHOR_OFFSET = { x: 0.5, y: 0.5 };

export default function Index() {
  const nearbyParams = useLocalSearchParams<{
    nearbyLat?: string;
    nearbyLng?: string;
    nearbyName?: string;
    nearbyNonce?: string;
  }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const defaultCampus = CAMPUSES[DEFAULT_CAMPUS];
  const [campusKey, setCampusKey] = useState<string>(DEFAULT_CAMPUS);

  const campusBuildingsData = useMemo(() => {
    return campusKey === "SGW" ? sgwBuildingsData.features : loyolaBuildingsData.features;
  }, [campusKey]);

  const permissionState = useLocationPermissions();
  const { location } = useWatchLocation({ enabled: permissionState.granted });

  // When DEV_OVERRIDE_LOCATION is set in utils/devConfig.ts, useWatchLocation
  // returns the mocked coordinates directly, so `location` is already the
  // effective location everywhere.
  const effectiveLocation = location;

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
    onRouteReady,
    endDirections,
    nextStep,
    prevStep,
    checkProgress,
    setTransportMode,
    previewRouteInfo,
    setPreviewRouteInfo,
  } = useDirections();

  const {
    fullRoute,
    calculateRoute,
    clearRoute,
  } = useCombinedNavigation();

  const [combinedStepIndex, setCombinedStepIndex] = useState(0);
  const [combinedRouteActive, setCombinedRouteActive] = useState(false);
  const [outdoorLegMode, setOutdoorLegMode] = useState<string>("DRIVING");

  const [showLabels, setShowLabels] = useState(
    defaultCampus.initialRegion.latitudeDelta <= LABEL_ZOOM_THRESHOLD
  );
  const handledNearbyNonceRef = useRef<string | null>(null);
  const [searchBarNonce, setSearchBarNonce] = useState<string | null>(null);

  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<any>(null);

  const [startChoice, setStartChoice] = useState<BuildingChoice | null>(null);
  const [destChoice, setDestChoice] = useState<BuildingChoice | null>(null);
  const [showShuttleModal, setShowShuttleModal] = useState(false);
  const [showIndoorMapModal, setShowIndoorMapModal] = useState(false);
  const [indoorBuildingCode, setIndoorBuildingCode] = useState<string | null>(null);
  const [indoorPresetRoute, setIndoorPresetRoute] = useState<{
    startNodeId?: string;
    endNodeId?: string;
    startLabel?: string;
    endLabel?: string;
  } | null>(null);

  // Concordia Shuttle option
  const [useShuttle, setUseShuttle] = useState(false);
  // Departure campus is always the opposite of the destination building's campus
  const shuttleCampus: "SGW" | "Loyola" = destChoice?.campus === "Loyola" ? "SGW" : "Loyola";

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
    clearRoute();
    setCombinedStepIndex(0);
    setCombinedRouteActive(false);
    setOutdoorLegMode("DRIVING");
    setIndoorPresetRoute(null);
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

  const shouldUseCombinedFlow = !!(startChoice?.room?.trim() || destChoice?.room?.trim());

  const startCombinedRoute = async (
    originRaw: string,
    destinationRaw: string,
    userCoords: { latitude: number; longitude: number }
  ) => {
    const route = await calculateRoute(
      originRaw,
      destinationRaw,
      false,
      directionsState.transportMode,
      userCoords,
      apiKey
    );

    setCombinedStepIndex(0);
    setCombinedRouteActive(route.length > 0);

    const outdoorSteps = route.filter((step) => step.source === "outdoor");
    if (outdoorSteps.length > 0) {
      // Store the transport mode for the outdoor leg
      setOutdoorLegMode(outdoorSteps[0].transportMode || "DRIVING");
      
      const outdoorOrigin = outdoorSteps[0].coordinates;
      const firstIndoorAfterOutdoor = route.find((step, idx) => {
        if (step.source !== "indoor") return false;
        return route.slice(0, idx).some((previous) => previous.source === "outdoor");
      });
      const outdoorDestination = firstIndoorAfterOutdoor?.coordinates ?? destChoice?.coordinate;

      if (isValidCoordinate(outdoorOrigin) && isValidCoordinate(outdoorDestination)) {
        startDirections(outdoorOrigin, outdoorDestination);
      } else {
        console.warn("[Index] Skipping outdoor handoff due to invalid coordinates", {
          outdoorOrigin,
          outdoorDestination,
        });
      }
      return;
    }

    endDirections();
  };

  const handleStartRoute = async () => {
    if (!destChoice || !effectiveLocation) return;

    // Same-building indoor POI with no start room: open the indoor map and highlight the POI.
    // When a start room is specified, fall through to the combined flow which handles routing.
    const destBuildingCode = destChoice.code?.toUpperCase();
    const isIndoorPoi = !!(destChoice.room && destBuildingCode && getBuildingIndoorMap(destBuildingCode));
    if (isIndoorPoi && !startChoice?.room) {
      const effectiveBuildingCode =
        startChoice && startChoice.id !== "current-location"
          ? startChoice.code?.toUpperCase()
          : userBuilding?.code?.toUpperCase();
      if (effectiveBuildingCode === destBuildingCode) {
        setIndoorBuildingCode(destBuildingCode);
        setIndoorPresetRoute({ endNodeId: destChoice.room });
        setShowIndoorMapModal(true);
        return;
      }
    }

    if (!shouldUseCombinedFlow) {
      setCombinedRouteActive(false);
      setOutdoorLegMode("DRIVING");
      clearRoute();
      startDirections({ latitude: effectiveLocation.coords.latitude, longitude: effectiveLocation.coords.longitude }, destChoice.coordinate);
      return;
    }

    const userCoords = {
      latitude: effectiveLocation.coords.latitude,
      longitude: effectiveLocation.coords.longitude,
    };

    const originRaw = buildRouteRaw(startChoice);
    const destinationRaw = buildRouteRaw(destChoice);

    await startCombinedRoute(originRaw, destinationRaw, userCoords);
  };

  const handleNextClassDirections = (classInfo: ParsedNextClass) => {
    if (!effectiveLocation) return;

    const userCoords = {
      latitude: effectiveLocation.coords.latitude,
      longitude: effectiveLocation.coords.longitude,
    };

    const trimmedRawLocation = classInfo.rawLocation?.trim();
    const trimmedRoom = classInfo.room?.trim();
    let destinationRaw = classInfo.buildingCode;

    if (trimmedRawLocation) {
      destinationRaw = trimmedRawLocation;
    } else if (trimmedRoom) {
      destinationRaw = `${classInfo.buildingCode} ${trimmedRoom}`;
    }

    const originRaw = userBuilding?.code ?? "";

    // Prefer stitched routing when next-class contains a room destination.
    if (classInfo.room?.trim()) {
      void startCombinedRoute(originRaw, destinationRaw, userCoords);
      return;
    }

    const buildingCoord = getBuildingCoordinate(classInfo.buildingCode);
    if (buildingCoord) {
      startDirections(
        userCoords,
        buildingCoord
      );
    } else {
      Alert.alert("Error", "Could not find coordinates for this building.");
    }
  };

  const handlePreviewRoute = () => {
    if (!destChoice || !startChoice || startChoice.id === "current-location") return;

    if (startChoice.id === destChoice.id) {
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

  // Accumulate all 3 shuttle preview leg results before updating the time estimate.
  const shuttlePreviewLegs = useRef<({ distance: number; duration: number } | null)[]>([null, null, null]);

  useEffect(() => {
    shuttlePreviewLegs.current = [null, null, null];
  }, [useShuttle, shuttleWaypoints, destChoice, startChoice]);

  const handlePreviewLegReady = useCallback((legIndex: 0 | 1 | 2, result: any) => {
    shuttlePreviewLegs.current[legIndex] = { distance: result.distance ?? 0, duration: result.duration ?? 0 };
    const all = shuttlePreviewLegs.current;
    if (all[0] && all[1] && all[2]) {
      const totalDist = all[0].distance + all[1].distance + all[2].distance;
      const totalDur = all[0].duration + all[1].duration + all[2].duration;
      setPreviewRouteInfo({
        distance: totalDist,
        duration: totalDur,
        distanceText: `${totalDist.toFixed(1)} km`,
        durationText: `${Math.round(totalDur)} min`,
      });
    }
  }, [setPreviewRouteInfo]);

  const handlePreviewLeg1Ready = useCallback((result: any) => handlePreviewLegReady(0, result), [handlePreviewLegReady]);
  const handlePreviewLeg2Ready = useCallback((result: any) => handlePreviewLegReady(1, result), [handlePreviewLegReady]);
  const handlePreviewLeg3Ready = useCallback((result: any) => handlePreviewLegReady(2, result), [handlePreviewLegReady]);

  const handleShowShuttleRoute = () => {
    const loyolaStop = shuttleData.busStops.loyola.coordinate;
    const sgwStop = shuttleData.busStops.sgw.coordinate;

    previewDirections(loyolaStop, sgwStop);
  };

   const resolveIndoorBuildingCode = (): string | null => {
      const candidates = [
        indoorBuildingCode,
        selectedBuildingData?.properties?.code,
        destChoice?.code,
        startChoice?.code,
        userBuilding?.code,
      ];

      for (const candidate of candidates) {
        const normalized = typeof candidate === "string" ? candidate.toUpperCase() : null;
        if (normalized && getBuildingIndoorMap(normalized)) {
          return normalized;
        }
      }

      return getIndoorBuildingCodes()[0] ?? null;
    };

    const handleOpenIndoorQuickAccess = () => {
      const fallbackCode = resolveIndoorBuildingCode();
      if (!fallbackCode) {
        Alert.alert("Indoor map unavailable", "No indoor map data is configured yet.");
        return;
      }

      setIndoorBuildingCode(fallbackCode);
      setIndoorPresetRoute(null);
      setShowIndoorMapModal(true);
    };
  const handleOpenIndoorMap = (building: BuildingChoice) => {
      const match = /\(([A-Za-z0-9]+)\)\s*$/.exec(building.name);
      const extractedCode = building.code ?? match?.[1];
      const normalizedCode = extractedCode?.toUpperCase();
      if (!normalizedCode) return;

      if (!getBuildingIndoorMap(normalizedCode)) return;

      setIndoorBuildingCode(normalizedCode);
      setIndoorPresetRoute(null);
      setShowIndoorMapModal(true);
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

  const handleShowIndoorMapFromModal = (buildingCode: string) => {
    const normalized = buildingCode.toUpperCase();
    if (!getBuildingIndoorMap(normalized)) return;
    setIndoorBuildingCode(normalized);
    setIndoorPresetRoute(null);
    setShowIndoorMapModal(true);
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
  }, [effectiveLocation, userBuilding, startChoice, campusKey, currentCampus]);

  useEffect(() => {
    const nearbyNonce = nearbyParams.nearbyNonce;
    if (!nearbyNonce || handledNearbyNonceRef.current === nearbyNonce) return;
    if (!effectiveLocation) return;

    const lat = Number(nearbyParams.nearbyLat);
    const lng = Number(nearbyParams.nearbyLng);

    handledNearbyNonceRef.current = nearbyNonce;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const destination = { latitude: lat, longitude: lng };
    const nearbyCampus = findCampusForCoordinate(lat, lng)?.campus.name as "SGW" | "Loyola" | undefined;
    const nearbyName = nearbyParams.nearbyName || "Nearby Destination";

    endDirections();
    clearRoute();
    setCombinedRouteActive(false);
    setCombinedStepIndex(0);
    setUseShuttle(false);
    setOutdoorLegMode("DRIVING");
    setSearchBarNonce(nearbyNonce);
    setDestChoice({
      id: `nearby-${nearbyNonce}`,
      name: nearbyName,
      coordinate: destination,
      campus: nearbyCampus,
    });
  }, [nearbyParams, effectiveLocation, clearRoute, endDirections]);

  const roomOptionsByBuilding = useMemo(() => {
    const grouped = new Map<string, Set<string>>();
    for (const floor of AllCampusData) {
      for (const node of floor.nodes ?? []) {
        if (node.type !== "room") continue;
        const label = node.label?.trim();
        const buildingCode = node.buildingId?.toUpperCase();
        if (!label || !buildingCode) continue;
        if (!grouped.has(buildingCode)) {
          grouped.set(buildingCode, new Set<string>());
        }
        grouped.get(buildingCode)?.add(label);
      }
    }

    const result: Record<string, string[]> = {};
    for (const [code, rooms] of grouped.entries()) {
      result[code] = Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return result;
  }, []);

  useEffect(() => {
    if (!combinedRouteActive || !effectiveLocation || fullRoute.length === 0) return;

    const currentStep = fullRoute[combinedStepIndex];
    const nextStep = fullRoute[combinedStepIndex + 1];
    if (!currentStep || !nextStep?.coordinates) return;

    const distanceToNext = getDistanceMeters(
      effectiveLocation.coords.latitude,
      effectiveLocation.coords.longitude,
      nextStep.coordinates.latitude,
      nextStep.coordinates.longitude
    );

    if (distanceToNext < 20) {
      setCombinedStepIndex((prev) => Math.min(prev + 1, fullRoute.length - 1));
    }
  }, [combinedRouteActive, combinedStepIndex, effectiveLocation, fullRoute]);

  useEffect(() => {
    if (!combinedRouteActive || !effectiveLocation || fullRoute.length === 0) return;

    const currentStep = fullRoute[combinedStepIndex];
    const nextStep = fullRoute[combinedStepIndex + 1];
    
    // Only auto-advance if we're on the last outdoor step and next step is indoor
    if (currentStep?.source !== "outdoor" || nextStep?.source !== "indoor") return;
    if (!nextStep?.coordinates) return;

    const distanceToNextStep = getDistanceMeters(
      effectiveLocation.coords.latitude,
      effectiveLocation.coords.longitude,
      nextStep.coordinates.latitude,
      nextStep.coordinates.longitude
    );

    // Auto-advance to next step when very close (don't skip - just go to next)
    if (distanceToNextStep < 35) {
      setCombinedStepIndex((prev) => Math.min(prev + 1, fullRoute.length - 1));
    }
  }, [combinedRouteActive, combinedStepIndex, effectiveLocation, fullRoute]);

  useEffect(() => {
    if (!combinedRouteActive) return;
    const currentStep = fullRoute[combinedStepIndex];
    if (currentStep?.source !== "indoor") return;
    if (!currentStep.buildingCode || !getBuildingIndoorMap(currentStep.buildingCode)) return;

    const startLabel = currentStep.startNodeLabel;
    const endLabel = currentStep.endNodeLabel;
    const startNodeId = currentStep.startNodeId;
    const endNodeId = currentStep.endNodeId;
    if ((!startNodeId || !endNodeId) && (!startLabel || !endLabel)) return;

    // Delay modal opening slightly so user sees the step displayed first
    const timer = setTimeout(() => {
      setIndoorBuildingCode(currentStep.buildingCode as string);
      setIndoorPresetRoute({ startNodeId, endNodeId, startLabel, endLabel });
      setShowIndoorMapModal(true);
    }, 500); // 500ms delay to show the step first
    
    return () => clearTimeout(timer);
  }, [combinedRouteActive, combinedStepIndex, fullRoute]);

  const activeSteps = combinedRouteActive ? fullRoute : directionsState.steps;
  const currentStepIndex = combinedRouteActive ? combinedStepIndex : directionsState.currentStepIndex;
  const navigationActive = directionsState.isActive || combinedRouteActive;
  const previewActive = !directionsState.isActive && !!directionsState.origin;
  const canGoPrev = currentStepIndex > 0;
  const canGoNext = currentStepIndex < activeSteps.length - 1;

  const handlePrevActiveStep = () => {
    if (combinedRouteActive) {
      if (!canGoPrev) return;
      setCombinedStepIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    prevStep();
  };

  const handleNextActiveStep = () => {
    if (combinedRouteActive) {
      if (!canGoNext) return;
      
      // Advance to next step
      const nextStepIndex = Math.min(combinedStepIndex + 1, activeSteps.length - 1);
      setCombinedStepIndex(nextStepIndex);
      
      // Modal opens automatically via useEffect when step is indoor
      return;
    }
    nextStep();
  };

  const buildingPolygons = useMemo(() => {
    return campusBuildingsData.map((building: any) => {
      const isSelected = selectedBuilding === building.id;
      const isUserInside = userBuilding?.id === building.id;
      const interiorPoint = getInteriorPoint(building.geometry.coordinates[0]);

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
          <Marker
            key={`tap-target-${building.id}`}
            coordinate={interiorPoint}
            onPress={() => handleBuildingSelect(building.id, building)}
            opacity={0}
            tracksViewChanges={false}
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
              <TouchableOpacity 
                style={styles.labelContainer}
                onPress={() => handleBuildingSelect(building.id, building)}
                activeOpacity={0.7}
              >
                <Text style={styles.buildingLabel}>{code}</Text>
              </TouchableOpacity>
            </Marker>
            {/* Invisible tap target marker for all buildings - improved hit area */}
            <Marker
              key={`label-tap-target-${building.id}`}
              coordinate={centroid}
              onPress={() => handleBuildingSelect(building.id, building)}
              opacity={0}
              tracksViewChanges={false}
            />
          </React.Fragment>
        );
      });
  }, [campusBuildingsData, selectedBuilding]);

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
        mode={combinedRouteActive ? outdoorLegMode : effectiveMode}
        {...getRouteLineStyle(combinedRouteActive ? outdoorLegMode : effectiveMode)}
        onReady={handleActiveRouteReady}
        onError={handleActiveRouteError}
      />
    );
  }, [
    directionsState.isActive, directionsState.origin, directionsState.destination,
    directionsState.transportMode, useShuttle, shuttleWaypoints, campusKey,
    apiKey, effectiveMode, outdoorLegMode, combinedRouteActive, handleRouteReady, handleActiveRouteReady,
    handleActiveRouteError, handleLeg1Error, handleLeg2Error, handleLeg3Error,
  ]);

  const previewRouteElement = useMemo(() => {
    // Shuttle-only preview: opened via shuttle schedule modal (no destChoice set)
    if (!directionsState.isActive && !destChoice && directionsState.origin && directionsState.destination) {
      return (
        <MapViewDirections
          key={`shuttle-preview-${directionsState.origin.latitude}-${directionsState.destination.latitude}`}
          origin={directionsState.origin}
          destination={directionsState.destination}
          apikey={apiKey}
          mode="DRIVING"
          {...getRouteLineStyle('SHUTTLE')}
          onReady={handleRoutePreviewReady}
        />
      );
    }
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
            onReady={handlePreviewLeg1Ready}
          />
          {/* Leg 2: shuttle departure stop → arrival stop (shuttle bus) */}
          <MapViewDirections
            key={`preview-leg2-${shuttleWaypoints[0].latitude}-${shuttleWaypoints[1].latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[0]}
            destination={shuttleWaypoints[1]}
            apikey={apiKey}
            mode="DRIVING"
            {...getRouteLineStyle('SHUTTLE')}
            onReady={handlePreviewLeg2Ready}
          />
          {/* Leg 3: shuttle arrival stop → destination */}
          <MapViewDirections
            key={`preview-leg3-${shuttleWaypoints[1].latitude}-${destChoice.coordinate.latitude}-${useShuttle}-${directionsState.transportMode}`}
            origin={shuttleWaypoints[1]}
            destination={destChoice.coordinate}
            apikey={apiKey}
            mode={directionsState.transportMode}
            {...getRouteLineStyle(directionsState.transportMode)}
            onReady={handlePreviewLeg3Ready}
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
    directionsState.isActive, directionsState.origin, directionsState.destination,
    directionsState.transportMode, destChoice,
    startChoice, effectiveLocation, useShuttle, shuttleWaypoints,
    apiKey, effectiveMode, handleRoutePreviewReady,
    handlePreviewLeg1Ready, handlePreviewLeg2Ready, handlePreviewLeg3Ready,
  ]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={selectedCampus.initialRegion}
        userInterfaceStyle={isDark ? "dark" : "light"}
        showsUserLocation={!DEV_OVERRIDE_LOCATION}
        onRegionChangeComplete={handleRegionChange}
      >
        {buildingPolygons}
        {showLabels && buildingLabels}

        {/* DEV: orange dot when location is overridden */}
        {DEV_OVERRIDE_LOCATION && effectiveLocation && (
          <Circle
            center={{
              latitude: effectiveLocation.coords.latitude,
              longitude: effectiveLocation.coords.longitude,
            }}
            radius={8}
            fillColor="orange"
            strokeColor="white"
            strokeWidth={2}
            zIndex={999}
          />
        )}

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

      {!navigationActive && (
        <SearchBar
          key={`search-${searchBarNonce ?? 'default'}`}
          buildings={buildingChoices}
          roomOptionsByBuilding={roomOptionsByBuilding}
          start={startChoice}
          destination={destChoice}
          onChangeStart={setStartChoice}
          onChangeDestination={setDestChoice}
          transportMode={directionsState.transportMode}
          onChangeTransportMode={setTransportMode}
          routeActive={navigationActive}
          defaultExpanded={!!searchBarNonce}
          previewActive={!directionsState.isActive && !!directionsState.origin}
          onEndRoute={handleEndDirections}
          onStartRoute={handleStartRoute}
          onPreviewRoute={handlePreviewRoute}
          onExitPreview={handleEndDirections}
          previewRouteInfo={previewRouteInfo}
          useShuttle={useShuttle}
          onUseShuttleChange={setUseShuttle}
          onOpenBuilding={handleOpenIndoorMap}
        />
      )}

      {previewActive && !navigationActive && (
        <TouchableOpacity
          testID="exit-preview.button"
          style={styles.exitPreviewButton}
          onPress={handleEndDirections}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Exit preview"
        >
          <Text style={styles.exitPreviewButtonText}>Exit Preview</Text>
        </TouchableOpacity>
      )}

        <IndoorMapModal
          visible={showIndoorMapModal}
          initialBuildingCode={indoorBuildingCode}
          presetRoute={indoorPresetRoute}
          onClose={() => {
            setShowIndoorMapModal(false);
            setIndoorPresetRoute(null);
          }}
          onClearRoute={handleEndDirections}
         />

      {!navigationActive && !previewActive && (
        <NextClassModal
          nextClass={nextClass}
          status={nextClassStatus}
          isLoading={nextClassLoading}
          onGetDirections={handleNextClassDirections}
        />
      )}

      {!navigationActive && (
        <CampusToggle selectedCampus={campusKey} onCampusChange={setCampusKey} />
      )}
      {!navigationActive && (
        <TouchableOpacity
          style={styles.shuttleButton}
          onPress={() => setShowShuttleModal(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open shuttle schedule"
        >
          <Text style={styles.shuttleButtonText}>🚌</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
         style={styles.indoorButton}
         onPress={handleOpenIndoorQuickAccess}
         activeOpacity={0.85}
      >
           <Text style={styles.indoorButtonText}>Indoor</Text>
      </TouchableOpacity>

      {userBuilding && (
        <TouchableOpacity
          style={styles.indoorButton}
          onPress={handleOpenIndoorQuickAccess}
          activeOpacity={0.85}
        >
          <Text style={styles.indoorButtonText}>Indoor</Text>
        </TouchableOpacity>
      )}

      {navigationActive && activeSteps.length > 0 && (
        <NavigationSteps
          steps={activeSteps}
          currentStepIndex={currentStepIndex}
          totalDistance={directionsState.routeInfo.distanceText ?? ""}
          totalDuration={directionsState.routeInfo.durationText ?? ""}
          isOffRoute={!combinedRouteActive && directionsState.isOffRoute}
          onEndNavigation={handleEndDirections}
          onNextStep={handleNextActiveStep}
          onPrevStep={handlePrevActiveStep}
        />
      )}

      <BuildingModal
        visible={!!selectedBuilding}
        building={selectedBuildingData}
        onClose={handleCloseModal}
        onDirectionsFrom={handleDirectionsFrom}
        onDirectionsTo={handleDirectionsTo}
        onShowIndoorMap={handleShowIndoorMapFromModal}
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
  indoorButton: {
      position: "absolute",
      top: 204,
      left: 16,
      minWidth: 56,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#8B0000",
      borderWidth: 1,
      borderColor: "#6E0000",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 1000,
    },

    indoorButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
    },

  shuttleButtonText: {
    fontSize: 28,
  },

  exitPreviewButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    left: "25%",
    right: "25%",
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: "#8B0000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 1000,
  },
  exitPreviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
