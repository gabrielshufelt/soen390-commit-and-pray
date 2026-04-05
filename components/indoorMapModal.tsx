import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  type DimensionValue,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  getBuildingIndoorMap,
  getBuildingIndoorGraphData,
  getFloorLabel,
  type IndoorNode,
  type IndoorFloorMap,
} from "@/utils/indoorMapData";
import { IndoorPathfinder, type IndoorNode as PathfinderIndoorNode } from "@/utils/indoorPathfinder";
import IndoorRouteOptionsModal from "@/components/IndoorRouteOptionsModal";
import { styles } from "@/styles/indoorMapModal.styles";

export type IndoorBuildingOption = {
  code: string;
  label: string;
};

type IndoorMapModalProps = {
  readonly visible: boolean;
  readonly initialBuildingCode: string | null;
  readonly presetRoute?: {
    startNodeId?: string;
    endNodeId?: string;
    startLabel?: string;
    endLabel?: string;
  } | null;
  readonly onClose: () => void;
  readonly onClearRoute?: () => void;
  readonly allowRouteGeneration?: boolean;
  readonly buildingOptions?: ReadonlyArray<IndoorBuildingOption>;
  readonly lockToInitialBuilding?: boolean;
};

const ROOM_NODE_TYPE = "room";
const ACCESSIBILITY_META = {
  water: { icon: "💧", label: "Water" },
  washroom: { icon: "🚻", label: "Washroom" },
  elevator: { icon: "🛗", label: "Elevator" },
  vending: { icon: "🥤", label: "Vending Machine" },
} as const;

type AccessibilityFilter = keyof typeof ACCESSIBILITY_META;

type RouteTransition = {
  id: string;
  message: string;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const getNodePositionPercent = (
  node: Pick<IndoorNode, "x" | "y">,
  floor: Pick<IndoorFloorMap, "canvasWidth" | "canvasHeight" | "offsetX" | "offsetY" | "scaleX" | "scaleY">
) => {
  const scaleX = floor.scaleX ?? 1;
  const scaleY = floor.scaleY ?? 1;
  const offsetX = floor.offsetX ?? 0;
  const offsetY = floor.offsetY ?? 0;

  const leftPct = clampPercent(((node.x * scaleX + offsetX) / floor.canvasWidth) * 100);
  const topPct = clampPercent(((node.y * scaleY + offsetY) / floor.canvasHeight) * 100);

  return {
    left: `${leftPct}%` as DimensionValue,
    top: `${topPct}%` as DimensionValue,
    leftPct,
    topPct,
  };
};

const getRoomNodes = (nodes: IndoorNode[]): IndoorNode[] => {
  return nodes.filter((node) => node.type === ROOM_NODE_TYPE && !!node.label?.trim());
};

const getNodeAccessibility = (node: IndoorNode): AccessibilityFilter | null => {
  const type = node.type.toLowerCase();
  const label = (node.label ?? "").toLowerCase();

  if (type.includes("elevator") || label.includes("elevator")) return "elevator";
  if (type.includes("washroom") || label.includes("washroom") || label.includes("bathroom")) {
    return "washroom";
  }
  if (type.includes("water") || label.includes("water")) {
    return "water";
  }
  if (type.includes("vending") || label.includes("vending")) {
    return "vending";
  }

  return null;
};

const getFacilityNodes = (nodes: IndoorNode[]): IndoorNode[] => {
  return nodes.filter((node) => node.type !== ROOM_NODE_TYPE && getNodeAccessibility(node) !== null);
};

const extractAccessibility = (roomLabel: string): AccessibilityFilter[] => {
  const accessibilities: AccessibilityFilter[] = [];
  const labelLower = roomLabel.toLowerCase();

  if (labelLower.includes("washroom") || labelLower.includes("bathroom")) accessibilities.push("washroom");
  if (labelLower.includes("water")) accessibilities.push("water");
  if (labelLower.includes("elevator")) accessibilities.push("elevator");
  if (labelLower.includes("vending")) accessibilities.push("vending");

  return accessibilities;
};

const getAccessibilityLabel = (facility: AccessibilityFilter): string => ACCESSIBILITY_META[facility].label;
const getAccessibilityFilterLabel = (facility: AccessibilityFilter): string =>
  facility === "vending" ? "Vending" : getAccessibilityLabel(facility);

const getNodeDisplayLabel = (node: IndoorNode): string => {
  const facility = getNodeAccessibility(node);
  const trimmedLabel = node.label?.trim();

  if (trimmedLabel) {
    if (facility) {
      const normalizedLabel = trimmedLabel.toLowerCase().replace(/[_\s]+/g, " ").trim();
      const normalizedFacilityLabel = getAccessibilityLabel(facility).toLowerCase();
      if (normalizedLabel === normalizedFacilityLabel || normalizedLabel === facility) {
        return getAccessibilityLabel(facility);
      }
    }
    return trimmedLabel;
  }

  if (!facility) return "Unknown";
  return getAccessibilityLabel(facility);
};

export default function IndoorMapModal({
  visible,
  initialBuildingCode,
  presetRoute,
  onClose,
  onClearRoute,
  allowRouteGeneration = true,
  buildingOptions = [],
  lockToInitialBuilding = false,
}: IndoorMapModalProps) {
  const isPresetRouteMode =
    !!presetRoute &&
    (!!(presetRoute.startNodeId && presetRoute.endNodeId) ||
      !!(presetRoute.startLabel && presetRoute.endLabel));

  const normalizedBuildingOptions = useMemo(() => {
    const seen = new Set<string>();
    return buildingOptions
      .map((option) => ({
        code: option.code.toUpperCase(),
        label: option.label.trim() || option.code.toUpperCase(),
      }))
      .filter((option) => {
        if (!getBuildingIndoorMap(option.code) || seen.has(option.code)) {
          return false;
        }
        seen.add(option.code);
        return true;
      });
  }, [buildingOptions]);

  const [selectedBuildingCode, setSelectedBuildingCode] = useState<string | null>(
    initialBuildingCode?.toUpperCase() ?? normalizedBuildingOptions[0]?.code ?? null
  );
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);

  const indoorMap = useMemo(() => {
    if (!selectedBuildingCode) return null;
    return getBuildingIndoorMap(selectedBuildingCode);
  }, [selectedBuildingCode]);

  const pathfinder = useMemo(() => {
    if (!selectedBuildingCode) return null;
    const graphData = getBuildingIndoorGraphData(selectedBuildingCode);
    if (!graphData || graphData.length === 0) return null;
    return new IndoorPathfinder(graphData);
  }, [selectedBuildingCode]);

  const [floorIndex, setFloorIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<IndoorNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<AccessibilityFilter[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "search">("map");
  const [routeStartNode, setRouteStartNode] = useState<IndoorNode | null>(null);
  const [routeEndNode, setRouteEndNode] = useState<IndoorNode | null>(null);
  const [routePath, setRoutePath] = useState<PathfinderIndoorNode[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [avoidStairs, setAvoidStairs] = useState(false);
  const [preferElevators, setPreferElevators] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartY, setPanStartY] = useState(0);

  const isViewOnlyMode = !allowRouteGeneration && !isPresetRouteMode;
  const canChooseBuilding =
    !lockToInitialBuilding && !isPresetRouteMode && normalizedBuildingOptions.length > 1;
  const selectedBuildingOption =
    normalizedBuildingOptions.find((option) => option.code === selectedBuildingCode) ?? null;

  useEffect(() => {
    if (!visible) return;

    const fallbackCode = initialBuildingCode?.toUpperCase() ?? normalizedBuildingOptions[0]?.code ?? null;
    if (fallbackCode) {
      setSelectedBuildingCode(fallbackCode);
    }
    setShowBuildingPicker(false);
  }, [visible, initialBuildingCode, normalizedBuildingOptions]);

  useEffect(() => {
    if (!indoorMap) {
      setFloorIndex(0);
      return;
    }

    const firstFloorIndex = Math.max(
      0,
      indoorMap.floors.findIndex((floor) => floor.floor === 1)
    );
    setFloorIndex(firstFloorIndex);
  }, [indoorMap]);

  useEffect(() => {
    setSelectedRoom(null);
    setRouteStartNode(null);
    setRouteEndNode(null);
    setRoutePath([]);
    setRouteError(null);
    setSearchQuery("");
    setActiveFilters([]);
    setViewMode("map");
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [selectedBuildingCode]);

  useEffect(() => {
    if (!isViewOnlyMode) return;
    setRouteStartNode(null);
    setRouteEndNode(null);
    setRoutePath([]);
    setRouteError(null);
  }, [isViewOnlyMode]);

  const currentFloor = indoorMap?.floors[floorIndex] ?? null;

  // Groups of consecutive same-floor nodes to draw as SVG polylines.
  // A floor transition breaks a group so we get separate line segments per floor.
  const routePolylines = useMemo<{ leftPct: number; topPct: number }[][]>(() => {
    if (!currentFloor || routePath.length < 2) return [];

    const groups: { leftPct: number; topPct: number }[][] = [];
    let currentGroup: { leftPct: number; topPct: number }[] = [];

    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];

      if (start.floor !== currentFloor.floor || end.floor !== currentFloor.floor) {
        if (currentGroup.length >= 2) groups.push(currentGroup);
        currentGroup = [];
        continue;
      }

      if (currentGroup.length === 0) {
        currentGroup.push(getNodePositionPercent(start, currentFloor));
      }
      currentGroup.push(getNodePositionPercent(end, currentFloor));
    }

    if (currentGroup.length >= 2) groups.push(currentGroup);
    return groups;
  }, [currentFloor, routePath]);

  const crossFloorTransitions = useMemo<RouteTransition[]>(() => {
    if (!currentFloor || routePath.length < 2) return [];

    const transitions: RouteTransition[] = [];
    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];
      if (start.floor === end.floor) continue;

      if (start.floor === currentFloor.floor) {
        const isStairTransition =
          start.type.toLowerCase().includes("stair") ||
          end.type.toLowerCase().includes("stair");
        const isElevatorTransition =
          start.type.toLowerCase().includes("elevator") ||
          end.type.toLowerCase().includes("elevator");
        let transitionMessage = `Continue to Floor ${getFloorLabel(end.floor)}`;

        if (isStairTransition) {
          transitionMessage = `Take stairs to Floor ${getFloorLabel(end.floor)}`;
        } else if (isElevatorTransition) {
          transitionMessage = `Take elevator to Floor ${getFloorLabel(end.floor)}`;
        }

        transitions.push({
          id: `up-${start.id}-${end.id}`,
          message: transitionMessage,
        });
      }

      if (end.floor === currentFloor.floor) {
        transitions.push({
          id: `down-${start.id}-${end.id}`,
          message: `Arrive from Floor ${getFloorLabel(start.floor)}`,
        });
      }
    }

    return transitions;
  }, [currentFloor, routePath]);

  const rooms = useMemo(() => {
    return currentFloor ? getRoomNodes(currentFloor.nodes) : [];
  }, [currentFloor]);

  const facilities = useMemo(() => {
    return currentFloor ? getFacilityNodes(currentFloor.nodes) : [];
  }, [currentFloor]);

  const searchableNodes = useMemo(() => {
    return [...rooms, ...facilities];
  }, [rooms, facilities]);

  const filteredRooms = useMemo(() => {
    return searchableNodes.filter((node) => {
      const nodeLabel = getNodeDisplayLabel(node).toLowerCase();
      const matchesSearch = searchQuery === "" || nodeLabel.includes(searchQuery.toLowerCase());

      if (activeFilters.length === 0) return matchesSearch;

      const nodeAccessibility = getNodeAccessibility(node);
      const roomAccessibilities = new Set([
        ...(nodeAccessibility ? [nodeAccessibility] : []),
        ...extractAccessibility(node.label),
      ]);
      const matchesFilters = activeFilters.some((filter) =>
        roomAccessibilities.has(filter)
      );

      return matchesSearch && matchesFilters;
    });
  }, [searchableNodes, searchQuery, activeFilters]);

  const toggleFilter = (filter: AccessibilityFilter) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const handleBuildingSelect = (buildingCode: string) => {
    setSelectedBuildingCode(buildingCode);
    setShowBuildingPicker(false);
  };

  const handleRoomPress = (room: IndoorNode) => {
    if (selectedRoom?.id === room.id) {
      // Single click to unselect
      setSelectedRoom(null);
    } else {
      // Single click to select
      setSelectedRoom(room);
    }
  };

  const computeRoute = useCallback((fromNode: IndoorNode, toNode: IndoorNode) => {
    if (!allowRouteGeneration && !isPresetRouteMode) {
      setRoutePath([]);
      setRouteError(null);
      return;
    }

    if (!pathfinder) {
      setRoutePath([]);
      setRouteError("Indoor routing data is unavailable for this building.");
      return;
    }

    const path = pathfinder.findShortestPath(fromNode.id, toNode.id, {
      wheelchairAccessible,
      avoidStairs,
      preferElevators,
    });
    if (!path || path.length < 2) {
      setRoutePath([]);
      const startName = fromNode.label.trim() || fromNode.id;
      const endName = toNode.label.trim() || toNode.id;
      setRouteError(`No indoor route found from ${startName} to ${endName}.`);
      return;
    }

    setRoutePath(path);
    setRouteError(null);
  }, [allowRouteGeneration, isPresetRouteMode, pathfinder, wheelchairAccessible, avoidStairs, preferElevators]);

  useEffect(() => {
    if (routeStartNode && routeEndNode) {
      computeRoute(routeStartNode, routeEndNode);
    }
  }, [routeStartNode, routeEndNode, computeRoute]);

  useEffect(() => {
    if (!visible || !indoorMap) return;
    const hasEnd = !!(presetRoute?.endNodeId || presetRoute?.endLabel);
    if (!hasEnd) return;

    const hasNodeIds = !!(presetRoute?.startNodeId && presetRoute?.endNodeId);
    const hasLabels = !!(presetRoute?.startLabel && presetRoute?.endLabel);

    const allNodes = indoorMap?.floors.flatMap((floor) => floor.nodes) ?? [];
    let startNode;
    if (hasNodeIds) {
      startNode = allNodes.find((node) => node.id === presetRoute?.startNodeId);
    } else if (hasLabels) {
      startNode = allNodes.find((node) => node.label.trim() === presetRoute?.startLabel?.trim());
    }
    const endNode = presetRoute?.endNodeId
      ? allNodes.find((node) => node.id === presetRoute?.endNodeId)
      : allNodes.find((node) => node.label.trim() === presetRoute?.endLabel?.trim());

    if (!endNode) return;

    // End-only: highlight the destination node without computing a route
    if (!startNode) {
      setSelectedRoom(endNode);
      setViewMode("map");
      const endFloorIndex = indoorMap?.floors.findIndex((floor) => floor.floor === endNode.floor) ?? -1;
      if (endFloorIndex >= 0) setFloorIndex(endFloorIndex);
      return;
    }

    setRouteStartNode(startNode);
    setRouteEndNode(endNode);
    setSelectedRoom(endNode);
    setViewMode("map");
    setZoom(1);
    setPanX(0);
    setPanY(0);

    const startFloorIndex = indoorMap?.floors.findIndex((floor) => floor.floor === startNode.floor) ?? -1;
    if (startFloorIndex >= 0) {
      setFloorIndex(startFloorIndex);
    }
  }, [visible, presetRoute, indoorMap]);

  const handleSetRouteFrom = () => {
    if (!allowRouteGeneration || !selectedRoom) return;
    setRouteStartNode(selectedRoom);
    if (routeEndNode) {
      computeRoute(selectedRoom, routeEndNode);
    } else {
      setRoutePath([]);
      setRouteError(null);
    }
  };

  const handleSetRouteTo = () => {
    if (!allowRouteGeneration || !selectedRoom) return;
    setRouteEndNode(selectedRoom);
    if (routeStartNode) {
      computeRoute(routeStartNode, selectedRoom);
    } else {
      setRoutePath([]);
      setRouteError(null);
    }
  };

  const clearRoute = () => {
    setRouteStartNode(null);
    setRouteEndNode(null);
    setRoutePath([]);
    setRouteError(null);
    // Clear combined navigation route (outdoor directions) if callback provided
    onClearRoute?.();
  };

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(3, prevZoom + 0.5));
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(1, prevZoom - 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMapPressIn = (event: any) => {
    if (zoom > 1) {
      setIsPanning(true);
      setPanStartX(event.nativeEvent.pageX - panX);
      setPanStartY(event.nativeEvent.pageY - panY);
    }
  };

  const handleMapMove = (event: any) => {
    if (isPanning && zoom > 1) {
      const newPanX = event.nativeEvent.pageX - panStartX;
      const newPanY = event.nativeEvent.pageY - panStartY;
      setPanX(newPanX);
      setPanY(newPanY);
    }
  };

  const handleMapPressOut = () => {
    setIsPanning(false);
  };

  const onNextFloor = () => {
    if (!indoorMap || indoorMap.floors.length <= 1) return;
    setFloorIndex((prev) => (prev + 1) % indoorMap.floors.length);
  };

  const onPrevFloor = () => {
    if (!indoorMap || indoorMap.floors.length <= 1) return;
    setFloorIndex((prev) => (prev - 1 + indoorMap.floors.length) % indoorMap.floors.length);
  };

  const renderRoomDot = (room: IndoorNode, floor: IndoorFloorMap, isSelected: boolean) => {
    const { left, top } = getNodePositionPercent(room, floor);

    const facility = getNodeAccessibility(room);
    const isFacility = facility !== null && room.type !== ROOM_NODE_TYPE;

    return (
      <TouchableOpacity
        key={room.id}
        style={[
          styles.roomDotContainer,
          { left, top },
          isSelected && styles.roomDotContainerSelected,
        ]}
        onPress={() => handleRoomPress(room)}
      >
        <View
          style={[
            styles.roomDot,
            isFacility && styles.facilityDot,
            isSelected && styles.roomDotSelected,
          ]}
        />
        <Text
          style={[
            styles.roomLabel,
            facility === "vending" && styles.roomLabelCompact,
            isSelected && styles.roomLabelSelected,
            isSelected && facility === "vending" && styles.roomLabelSelectedCompact,
          ]}
        >
          {isFacility && facility ? `${ACCESSIBILITY_META[facility].icon} ${getNodeDisplayLabel(room)}` : room.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRoomCard = (room: IndoorNode) => {
    const isSelected = selectedRoom?.id === room.id;
    const facility = getNodeAccessibility(room);
    const label = getNodeDisplayLabel(room);
    const accessibilityStatus = room.accessible ? "Accessible" : "Not accessible";
    const facilityText = facility
      ? `${getAccessibilityLabel(facility)} facility`
      : null;
    const accessibilityText = facilityText ?? accessibilityStatus;
    return (
      <TouchableOpacity
        key={room.id}
        style={[styles.roomCard, isSelected && styles.roomCardSelected]}
        onPress={() => handleRoomPress(room)}
      >
        <Text style={[styles.roomCardCode, isSelected && styles.roomCardCodeSelected]}>
          {facility ? `${ACCESSIBILITY_META[facility].icon} ${label}` : label}
        </Text>
        <Text style={styles.roomCardMeta}>
          {accessibilityText}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {canChooseBuilding
                ? "Indoor Map"
                : indoorMap
                  ? `${indoorMap.buildingId} Indoor Map`
                  : "Indoor Map"}
            </Text>

            {canChooseBuilding && (
              <View style={styles.buildingPickerContainer}>
                <TouchableOpacity
                  style={styles.buildingPickerButton}
                  onPress={() => setShowBuildingPicker((prev) => !prev)}
                  activeOpacity={0.8}
                  testID="indoor-building-picker-toggle"
                >
                  <Text numberOfLines={1} style={styles.buildingPickerText}>
                    {selectedBuildingOption?.label ??
                      (selectedBuildingCode ? `${selectedBuildingCode} Indoor Map` : "Select a building")}
                  </Text>
                  <Text style={styles.buildingPickerChevron}>{showBuildingPicker ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {showBuildingPicker && (
                  <View style={styles.buildingDropdown} testID="indoor-building-picker-menu">
                    {normalizedBuildingOptions.map((option) => {
                      const isActive = option.code === selectedBuildingCode;
                      return (
                        <TouchableOpacity
                          key={option.code}
                          style={[styles.buildingOption, isActive && styles.buildingOptionActive]}
                          onPress={() => handleBuildingSelect(option.code)}
                          activeOpacity={0.8}
                          testID={`indoor-building-option-${option.code}`}
                        >
                          <Text
                            style={[
                              styles.buildingOptionText,
                              isActive && styles.buildingOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            {allowRouteGeneration && (
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  wheelchairAccessible && styles.menuButtonActive,
                ]}
                onPress={() => setShowRouteOptions(true)}
                accessibilityRole="button"
                accessibilityLabel="Accessibility and route options"
                accessibilityHint="Open accessible routing and route preference settings"
                testID="indoor.options.menu"
              >
                <Text
                  style={[
                    styles.menuButtonText,
                    wheelchairAccessible && styles.menuButtonTextActive,
                  ]}
                >
                  ♿
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!indoorMap || !currentFloor ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No indoor floor map available.</Text>
            <Text style={styles.emptyStateSubtitle}>
              Please choose a building that has indoor map data.
            </Text>
          </View>
        ) : (
          <>
            {isViewOnlyMode && (
              <View style={styles.viewOnlyBanner}>
                <Text style={styles.viewOnlyBannerText}>
                  Browse floors and rooms only. Indoor routing becomes available once you are inside the selected Concordia building.
                </Text>
              </View>
            )}

            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, viewMode === "map" && styles.tabActive]}
                onPress={() => setViewMode("map")}
              >
                <Text style={[styles.tabText, viewMode === "map" && styles.tabTextActive]}>
                  Map
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, viewMode === "search" && styles.tabActive]}
                onPress={() => setViewMode("search")}
              >
                <Text style={[styles.tabText, viewMode === "search" && styles.tabTextActive]}>
                  Rooms
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === "map" ? (
              <>
                <View style={styles.floorControls}>
                  <TouchableOpacity style={styles.floorArrowButton} onPress={onPrevFloor}>
                    <Text style={styles.floorArrowText}>◀</Text>
                  </TouchableOpacity>

                  <View style={styles.floorInfoPill}>
                    <Text style={styles.floorInfoText}>Floor {getFloorLabel(currentFloor.floor)}</Text>
                  </View>

                  <TouchableOpacity style={styles.floorArrowButton} onPress={onNextFloor}>
                    <Text style={styles.floorArrowText}>▶</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.zoomControlsContainer}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <Text style={styles.zoomButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.zoomLevelText}>{zoom.toFixed(1)}x</Text>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={handleZoomOut}
                    disabled={zoom <= 1}
                  >
                    <Text style={styles.zoomButtonText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={handleResetZoom}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mapViewContainer}>
                  <View
                    style={styles.mapScrollContainer}
                    onTouchStart={handleMapPressIn}
                    onTouchMove={handleMapMove}
                    onTouchEnd={handleMapPressOut}
                  >
                    <View
                      style={[
                        styles.mapCard,
                        {
                          transform: [
                            { scale: zoom },
                            { translateX: panX },
                            { translateY: panY }
                          ],
                          transformOrigin: zoom > 1 ? "center" : "0 0"
                        }
                      ]}
                    >
                      <Image source={currentFloor.image} style={styles.floorImage} resizeMode="stretch" />
                      <View style={styles.roomOverlay}>
                        {routePolylines.length > 0 && (
                          <Svg
                            testID="route-segment"
                            style={{ position: "absolute", width: "100%", height: "100%" }}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            {routePolylines.map((points) => {
                              const pointsStr = points.map(p => `${p.leftPct},${p.topPct}`).join(" ");
                              return (
                              <Polyline
                                key={pointsStr}
                                points={pointsStr}
                                stroke="#1565C0"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                fill="none"
                              />
                              );
                            })}
                          </Svg>
                        )}

                        {routePath.length > 1 && currentFloor && (() => {
                          const startNode = routePath[0];
                          const endNode = routePath[routePath.length - 1];
                          const startOnFloor = startNode.floor === currentFloor.floor;
                          const endOnFloor = endNode.floor === currentFloor.floor;

                          return (
                            <>
                              {startOnFloor && (
                                <View
                                  testID="route-start-marker"
                                  style={[
                                    styles.routeEndpoint,
                                    styles.routeStartEndpoint,
                                    getNodePositionPercent(startNode, currentFloor),
                                  ]}
                                />
                              )}
                              {endOnFloor && (
                                <View
                                  testID="route-end-marker"
                                  style={[
                                    styles.routeEndpoint,
                                    styles.routeEndEndpoint,
                                    getNodePositionPercent(endNode, currentFloor),
                                  ]}
                                />
                              )}
                            </>
                          );
                        })()}

                        {[...rooms, ...facilities].map((room) =>
                          renderRoomDot(room, currentFloor, selectedRoom?.id === room.id)
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {(routeStartNode || routeEndNode || routeError || crossFloorTransitions.length > 0) && (
                  <View style={styles.routeInfoCard}>
                    {routeStartNode && routeEndNode ? (
                      <Text style={styles.routeInfoText}>
                        Route: {routeStartNode.label.trim()} to {routeEndNode.label.trim()}
                      </Text>
                    ) : (
                      <Text style={styles.routeInfoText}>
                        {routeStartNode
                          ? `Start set: ${routeStartNode.label.trim()}`
                          : routeEndNode
                            ? `Destination set: ${routeEndNode.label.trim()}`
                            : "Pick rooms to generate a route."}
                      </Text>
                    )}

                    {crossFloorTransitions.map((transition) => (
                      <Text key={transition.id} testID="cross-floor-direction" style={styles.crossFloorText}>
                        {transition.message}
                      </Text>
                    ))}

                    {routeError && <Text style={styles.routeErrorText}>{routeError}</Text>}

                    {(routePath.length > 0 || routeStartNode || routeEndNode) && (
                      <TouchableOpacity style={styles.clearRouteButton} onPress={clearRoute}>
                        <Text style={styles.clearRouteButtonText}>Clear Route</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {selectedRoom && (
                  <View style={styles.selectedRoomCard}>
                    <Text style={styles.selectedRoomLabel}>{getNodeDisplayLabel(selectedRoom)}</Text>
                    {!isPresetRouteMode && allowRouteGeneration && (
                      <>
                        <TouchableOpacity
                          style={[styles.directionButton, styles.directionButtonTo]}
                          onPress={handleSetRouteTo}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.directionButtonToText}>Get Directions To</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.directionButton, styles.directionButtonFrom]}
                          onPress={handleSetRouteFrom}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.directionButtonFromText}>Get Directions From</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {!isPresetRouteMode && isViewOnlyMode && (
                      <Text style={styles.selectedRoomHelperText}>
                        View-only mode is active outside Concordia buildings. You can browse rooms and floors here, but routing stays disabled.
                      </Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search rooms, facilities..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.filterContainer}>
                  {(Object.keys(ACCESSIBILITY_META) as AccessibilityFilter[]).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterButton,
                        activeFilters.includes(filter) && styles.filterButtonActive,
                      ]}
                      onPress={() => toggleFilter(filter)}
                    >
                      <Text style={styles.filterIcon}>{ACCESSIBILITY_META[filter].icon}</Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.filterLabel,
                          activeFilters.includes(filter) && styles.filterLabelActive,
                        ]}
                      >
                        {getAccessibilityFilterLabel(filter)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.floorTabsContainer}>
                  {indoorMap.floors.map((floor, index) => (
                    <TouchableOpacity
                      key={floor.floor}
                      style={[
                        styles.floorTab,
                        floorIndex === index && styles.floorTabActive,
                      ]}
                      onPress={() => setFloorIndex(index)}
                    >
                      <Text
                        style={[
                          styles.floorTabText,
                          floorIndex === index && styles.floorTabTextActive,
                        ]}
                      >
                        {getFloorLabel(floor.floor)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FlatList
                  data={filteredRooms}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => renderRoomCard(item)}
                  numColumns={2}
                  columnWrapperStyle={styles.roomGridRow}
                  contentContainerStyle={styles.roomGridContent}
                  scrollEnabled={true}
                  style={styles.roomGrid}
                />
              </>
            )}
          </>
        )}
        <IndoorRouteOptionsModal
          visible={showRouteOptions}
          wheelchairAccessible={wheelchairAccessible}
          avoidStairs={avoidStairs}
          preferElevators={preferElevators}
          onChangeWheelchairAccessible={setWheelchairAccessible}
          onChangeAvoidStairs={setAvoidStairs}
          onChangePreferElevators={setPreferElevators}
          onClose={() => setShowRouteOptions(false)}
        />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}