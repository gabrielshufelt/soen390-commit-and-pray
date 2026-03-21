import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import type { DimensionValue } from "react-native";

import {
  getBuildingIndoorMap,
  getFloorLabel,
  type IndoorNode,
  type IndoorFloorMap,
} from "@/utils/indoorMapData";
import { styles } from "@/styles/indoorMapModal.styles";

type IndoorMapModalProps = {
  visible: boolean;
  initialBuildingCode: string | null;
  onClose: () => void;
};

const ROOM_NODE_TYPE = "room";
const ACCESSIBILITY_ICONS = {
  water: "💧",
  washroom: "🚻",
  elevator: "🛗",
  food: "🍽️",
};

type AccessibilityFilter = keyof typeof ACCESSIBILITY_ICONS;

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

  const [floorIndex, setFloorIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<IndoorNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<AccessibilityFilter[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "search">("map");

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

  const currentFloor = indoorMap?.floors[floorIndex] ?? null;

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
      const roomAccessibilities = [
        ...(nodeAccessibility ? [nodeAccessibility] : []),
        ...extractAccessibility(node.label),
      ];
      const matchesFilters = activeFilters.some((filter) =>
        roomAccessibilities.includes(filter)
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

  const onNextFloor = () => {
    if (!indoorMap || indoorMap.floors.length <= 1) return;
    setFloorIndex((prev) => (prev + 1) % indoorMap.floors.length);
  };

  const onPrevFloor = () => {
    if (!indoorMap || indoorMap.floors.length <= 1) return;
    setFloorIndex((prev) => (prev - 1 + indoorMap.floors.length) % indoorMap.floors.length);
  };

  const renderRoomDot = (room: IndoorNode, floor: IndoorFloorMap, isSelected: boolean) => {
    const scaleX = floor.scaleX ?? 1;
    const scaleY = floor.scaleY ?? 1;
    const offsetX = floor.offsetX ?? 0;
    const offsetY = floor.offsetY ?? 0;

    const leftPct = ((room.x * scaleX + offsetX) / floor.canvasWidth) * 100;
    const topPct = ((room.y * scaleY + offsetY) / floor.canvasHeight) * 100;

    const left = `${Math.max(0, Math.min(100, leftPct))}%` as DimensionValue;
    const top = `${Math.max(0, Math.min(100, topPct))}%` as DimensionValue;

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
          {facility
            ? `${facility.charAt(0).toUpperCase() + facility.slice(1)} facility`
            : room.accessible
            ? "Accessible"
            : "Not accessible"}
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

                <View style={styles.mapCard}>
                  <Image source={currentFloor.image} style={styles.floorImage} resizeMode="stretch" />
                  <View style={styles.roomOverlay}>
                    {[...rooms, ...facilities].map((room) =>
                      renderRoomDot(room, currentFloor, selectedRoom?.id === room.id)
                    )}
                  </View>
                </View>

                {selectedRoom && (
                  <View style={styles.selectedRoomCard}>
                    <Text style={styles.selectedRoomLabel}>{selectedRoom.label}</Text>
                    <TouchableOpacity style={styles.directionsButton}>
                      <Text style={styles.directionsButtonText}>🧭 Get Directions</Text>
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