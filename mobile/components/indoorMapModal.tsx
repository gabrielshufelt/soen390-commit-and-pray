import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
} from "react-native";
import type { DimensionValue } from "react-native";

import {
  getBuildingIndoorMap,
  getBuildingIndoorGraphData,
  getFloorLabel,
  type IndoorNode,
  type IndoorFloorMap,
} from "@/utils/indoorMapData";
import { IndoorPathfinder, type IndoorNode as PathfinderIndoorNode } from "@/utils/indoorPathfinder";
import { styles } from "@/styles/indoorMapModal.styles";

type IndoorMapModalProps = {
  readonly visible: boolean;
  readonly initialBuildingCode: string | null;
  readonly onClose: () => void;
};

const ROOM_NODE_TYPE = "room";
const ACCESSIBILITY_ICONS = {
  water: "💧",
  washroom: "🚻",
  elevator: "🛗",
  food: "🍽️",
};

type AccessibilityFilter = keyof typeof ACCESSIBILITY_ICONS;

type RouteSegment = {
  id: string;
  left: DimensionValue;
  top: DimensionValue;
  width: number;
  angle: number;
};

type RouteTransition = {
  id: string;
  left: DimensionValue;
  top: DimensionValue;
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
  const label = node.label.toLowerCase();

  if (type.includes("elevator") || label.includes("elevator")) return "elevator";
  if (type.includes("washroom") || label.includes("washroom") || label.includes("bathroom")) {
    return "washroom";
  }
  if (type.includes("water") || label.includes("water") || label.includes("fountain")) {
    return "water";
  }
  if (label.includes("cafe") || label.includes("food")) return "food";

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
  if (labelLower.includes("cafe") || labelLower.includes("food")) accessibilities.push("food");

  return accessibilities;
};

const getNodeDisplayLabel = (node: IndoorNode): string => {
  if (node.label?.trim()) return node.label;
  const facility = getNodeAccessibility(node);
  if (!facility) return "Unknown";
  return facility.charAt(0).toUpperCase() + facility.slice(1);
};

export default function IndoorMapModal({
  visible,
  initialBuildingCode,
  onClose,
}: IndoorMapModalProps) {
  const indoorMap = useMemo(() => {
    if (!initialBuildingCode) return null;
    return getBuildingIndoorMap(initialBuildingCode);
  }, [initialBuildingCode]);

  const pathfinder = useMemo(() => {
    if (!initialBuildingCode) return null;
    const graphData = getBuildingIndoorGraphData(initialBuildingCode);
    if (!graphData || graphData.length === 0) return null;
    return new IndoorPathfinder(graphData);
  }, [initialBuildingCode]);

  const [floorIndex, setFloorIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<IndoorNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<AccessibilityFilter[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "search">("map");
  const [routeStartNode, setRouteStartNode] = useState<IndoorNode | null>(null);
  const [routeEndNode, setRouteEndNode] = useState<IndoorNode | null>(null);
  const [routePath, setRoutePath] = useState<PathfinderIndoorNode[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartY, setPanStartY] = useState(0);

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
  }, [initialBuildingCode]);

  const currentFloor = indoorMap?.floors[floorIndex] ?? null;

  const routeSegments = useMemo<RouteSegment[]>(() => {
    if (!currentFloor || routePath.length < 2) return [];

    const segments: RouteSegment[] = [];
    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];
      if (start.floor !== currentFloor.floor || end.floor !== currentFloor.floor) {
        continue;
      }

      const startPct = getNodePositionPercent(start, currentFloor);
      const endPct = getNodePositionPercent(end, currentFloor);

      const dx = endPct.leftPct - startPct.leftPct;
      const dy = endPct.topPct - startPct.topPct;
      const width = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      segments.push({
        id: `${start.id}-${end.id}`,
        left: `${startPct.leftPct}%`,
        top: `${startPct.topPct}%`,
        width,
        angle,
      });
    }

    return segments;
  }, [currentFloor, routePath]);

  const crossFloorTransitions = useMemo<RouteTransition[]>(() => {
    if (!currentFloor || routePath.length < 2) return [];

    const transitions: RouteTransition[] = [];
    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];
      if (start.floor === end.floor) continue;

      if (start.floor === currentFloor.floor) {
        const startPct = getNodePositionPercent(start, currentFloor);
        transitions.push({
          id: `up-${start.id}-${end.id}`,
          left: startPct.left,
          top: startPct.top,
          message: `Take elevator to Floor ${getFloorLabel(end.floor)}`,
        });
      }

      if (end.floor === currentFloor.floor) {
        const endPct = getNodePositionPercent(end, currentFloor);
        transitions.push({
          id: `down-${start.id}-${end.id}`,
          left: endPct.left,
          top: endPct.top,
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

  const handleRoomPress = (room: IndoorNode) => {
    if (selectedRoom?.id === room.id) {
      // Single click to unselect
      setSelectedRoom(null);
    } else {
      // Single click to select
      setSelectedRoom(room);
    }
  };

  const computeRoute = (fromNode: IndoorNode, toNode: IndoorNode) => {
    if (!pathfinder) {
      setRoutePath([]);
      setRouteError("Indoor routing data is unavailable for this building.");
      return;
    }

    if (fromNode.type !== ROOM_NODE_TYPE || toNode.type !== ROOM_NODE_TYPE) {
      setRoutePath([]);
      setRouteError("Directions are only supported between rooms.");
      return;
    }

    const startLabel = fromNode.label.trim();
    const endLabel = toNode.label.trim();

    if (!startLabel || !endLabel) {
      setRoutePath([]);
      setRouteError("Selected rooms must have valid labels.");
      return;
    }

    const path = pathfinder.findShortestPath(startLabel, endLabel);
    if (!path || path.length < 2) {
      setRoutePath([]);
      setRouteError(`No indoor route found from ${startLabel} to ${endLabel}.`);
      return;
    }

    setRoutePath(path);
    setRouteError(null);
  };

  const handleSetRouteFrom = () => {
    if (!selectedRoom) return;
    setRouteStartNode(selectedRoom);
    if (routeEndNode) {
      computeRoute(selectedRoom, routeEndNode);
    } else {
      setRoutePath([]);
      setRouteError(null);
    }
  };

  const handleSetRouteTo = () => {
    if (!selectedRoom) return;
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
        <Text style={[styles.roomLabel, isSelected && styles.roomLabelSelected]}>
          {isFacility && facility ? `${ACCESSIBILITY_ICONS[facility]} ${getNodeDisplayLabel(room)}` : room.label}
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
      ? `${facility.charAt(0).toUpperCase() + facility.slice(1)} facility`
      : null;
    const accessibilityText = facilityText ?? accessibilityStatus;
    return (
      <TouchableOpacity
        key={room.id}
        style={[styles.roomCard, isSelected && styles.roomCardSelected]}
        onPress={() => handleRoomPress(room)}
      >
        <Text style={[styles.roomCardCode, isSelected && styles.roomCardCodeSelected]}>
          {facility ? `${ACCESSIBILITY_ICONS[facility]} ${label}` : label}
        </Text>
        <Text style={styles.roomCardMeta}>
          {accessibilityText}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {indoorMap ? `${indoorMap.buildingId} Indoor Map` : "Indoor Map"}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
                        {routeSegments.map((segment) => (
                          <View
                            key={segment.id}
                            testID="route-segment"
                            style={[
                              styles.routeSegment,
                              {
                                left: segment.left,
                                top: segment.top,
                                width: `${segment.width}%`,
                                transform: [{ rotate: `${segment.angle}deg` }],
                              },
                            ]}
                          />
                        ))}

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
                    <Text style={styles.selectedRoomLabel}>{selectedRoom.label}</Text>
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
                  {(Object.keys(ACCESSIBILITY_ICONS) as AccessibilityFilter[]).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterButton,
                        activeFilters.includes(filter) && styles.filterButtonActive,
                      ]}
                      onPress={() => toggleFilter(filter)}
                    >
                      <Text style={styles.filterIcon}>{ACCESSIBILITY_ICONS[filter]}</Text>
                      <Text
                        style={[
                          styles.filterLabel,
                          activeFilters.includes(filter) && styles.filterLabelActive,
                        ]}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
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
      </View>
    </Modal>
  );
}