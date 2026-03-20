import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import {
  getSupportedIndoorBuildings,
  IndoorBuildingMap,
  IndoorFloorMap,
  IndoorPoint,
  IndoorRoom,
} from "../data/indoorMaps";

type Props = {
  visible: boolean;
  initialBuildingCode?: string | null;
  onClose: () => void;
};

type SelectionMode = "start" | "destination";

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function floorSort(a: IndoorFloorMap, b: IndoorFloorMap): number {
  return a.floor - b.floor;
}

function pointToPercent(point: IndoorPoint, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return {
    left: clampPercent(((point.x - bounds.minX) / width) * 100),
    top: clampPercent(((point.y - bounds.minY) / height) * 100),
  };
}

function asPercent(value: number): `${number}%` {
  return `${value}%` as `${number}%`;
}

function polygonBoxToPercent(points: IndoorPoint[], bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const topLeft = pointToPercent({ x: minX, y: minY }, bounds);
  const bottomRight = pointToPercent({ x: maxX, y: maxY }, bounds);

  return {
    left: asPercent(topLeft.left),
    top: asPercent(topLeft.top),
    width: asPercent(Math.max(1.5, bottomRight.left - topLeft.left)),
    height: asPercent(Math.max(1.5, bottomRight.top - topLeft.top)),
  };
}

export default function IndoorMapModal({ visible, initialBuildingCode, onClose }: Props) {
  const buildings = useMemo(() => getSupportedIndoorBuildings(), []);

  const [selectedBuildingCode, setSelectedBuildingCode] = useState<string>(buildings[0]?.buildingCode ?? "");
  const [selectedFloor, setSelectedFloor] = useState<number>(buildings[0]?.floors?.[0]?.floor ?? 0);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("destination");
  const [selectedStartRoom, setSelectedStartRoom] = useState<IndoorRoom | null>(null);
  const [selectedDestinationRoom, setSelectedDestinationRoom] = useState<IndoorRoom | null>(null);

  useEffect(() => {
    if (!visible || !initialBuildingCode) return;

    const matchingBuilding = buildings.find((building) => building.buildingCode === initialBuildingCode.toUpperCase());
    if (!matchingBuilding) return;

    setSelectedBuildingCode(matchingBuilding.buildingCode);
    setSelectedFloor(matchingBuilding.floors.sort(floorSort)[0]?.floor ?? 0);
    setSelectedStartRoom(null);
    setSelectedDestinationRoom(null);
  }, [visible, initialBuildingCode, buildings]);

  const selectedBuilding: IndoorBuildingMap | undefined = useMemo(
    () => buildings.find((building) => building.buildingCode === selectedBuildingCode),
    [buildings, selectedBuildingCode]
  );

  const floors = useMemo(() => (selectedBuilding?.floors ?? []).slice().sort(floorSort), [selectedBuilding]);

  const currentFloorMap = useMemo(
    () => floors.find((floor) => floor.floor === selectedFloor) ?? floors[0],
    [floors, selectedFloor]
  );

  const roomLookup = useMemo(() => {
    const map = new Map<string, IndoorRoom>();
    currentFloorMap?.rooms.forEach((room) => map.set(room.id, room));
    return map;
  }, [currentFloorMap]);

  useEffect(() => {
    if (!currentFloorMap) return;

    if (selectedStartRoom && !roomLookup.has(selectedStartRoom.id)) {
      setSelectedStartRoom(null);
    }

    if (selectedDestinationRoom && !roomLookup.has(selectedDestinationRoom.id)) {
      setSelectedDestinationRoom(null);
    }
  }, [currentFloorMap, roomLookup, selectedStartRoom, selectedDestinationRoom]);

  const mapBounds = useMemo(() => {
    if (!currentFloorMap) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    const xs = currentFloorMap.hallwayPolygon.map((point) => point.x);
    const ys = currentFloorMap.hallwayPolygon.map((point) => point.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [currentFloorMap]);

  function applyRoomSelection(room: IndoorRoom): void {
    if (selectionMode === "start") {
      setSelectedStartRoom(room);
      return;
    }

    setSelectedDestinationRoom(room);
  }

  function renderRoom(room: IndoorRoom) {
    const marker = pointToPercent(room.center, mapBounds);
    const box = polygonBoxToPercent(room.polygon, mapBounds);

    const isStart = selectedStartRoom?.id === room.id;
    const isDestination = selectedDestinationRoom?.id === room.id;

    return (
      <React.Fragment key={room.id}>
        <View style={[styles.roomPolygon, box]} />
        <TouchableOpacity
          testID={`indoor.room.marker.${room.id}`}
          style={[
            styles.roomMarker,
            { left: `${marker.left}%`, top: `${marker.top}%` },
            isStart && styles.roomMarkerStart,
            isDestination && styles.roomMarkerDestination,
          ]}
          onPress={() => applyRoomSelection(room)}
          accessibilityRole="button"
          accessibilityLabel={`Room ${room.label}`}
        >
          <Text style={styles.roomMarkerText}>{room.label}</Text>
        </TouchableOpacity>
      </React.Fragment>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Indoor Map</Text>
            <TouchableOpacity testID="indoor.close" style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Building</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {buildings.map((building) => {
              const active = building.buildingCode === selectedBuildingCode;
              return (
                <TouchableOpacity
                  key={building.buildingCode}
                  testID={`indoor.building.${building.buildingCode}`}
                  style={[styles.selectorChip, active && styles.selectorChipActive]}
                  onPress={() => {
                    setSelectedBuildingCode(building.buildingCode);
                    setSelectedFloor(building.floors.slice().sort(floorSort)[0]?.floor ?? 0);
                    setSelectedStartRoom(null);
                    setSelectedDestinationRoom(null);
                  }}
                >
                  <Text style={[styles.selectorChipText, active && styles.selectorChipTextActive]}>
                    {building.buildingCode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Floor</Text>
          <View style={styles.flatFloorRow}>
            {floors.map((floor) => {
              const active = floor.floor === currentFloorMap?.floor;
              return (
                <TouchableOpacity
                  key={`${selectedBuildingCode}-${floor.floor}`}
                  testID={`indoor.floor.${floor.floorLabel}`}
                  style={[styles.floorChip, active && styles.floorChipActive]}
                  onPress={() => setSelectedFloor(floor.floor)}
                >
                  <Text style={[styles.floorChipText, active && styles.floorChipTextActive]}>
                    {`Floor ${floor.floorLabel}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Rooms</Text>
          <View style={styles.selectionModeRow}>
            <TouchableOpacity
              testID="indoor.mode.start"
              style={[styles.modeButton, selectionMode === "start" && styles.modeButtonActive]}
              onPress={() => setSelectionMode("start")}
            >
              <Text style={[styles.modeButtonText, selectionMode === "start" && styles.modeButtonTextActive]}>
                Pick Start
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="indoor.mode.destination"
              style={[styles.modeButton, selectionMode === "destination" && styles.modeButtonActive]}
              onPress={() => setSelectionMode("destination")}
            >
              <Text style={[styles.modeButtonText, selectionMode === "destination" && styles.modeButtonTextActive]}>
                Pick Destination
              </Text>
            </TouchableOpacity>
          </View>

          <View testID="indoor.canvas" style={styles.canvas}>
            <View testID="indoor.hallway" style={styles.hallway} />
            {currentFloorMap?.rooms.map(renderRoom)}
          </View>

          <View style={styles.selectedSummary}>
            <Text testID="indoor.selection.start" style={styles.selectedText}>
              {`Start: ${selectedStartRoom?.label ?? "None"}`}
            </Text>
            <Text testID="indoor.selection.destination" style={styles.selectedText}>
              {`Destination: ${selectedDestinationRoom?.label ?? "None"}`}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChipRow}>
            {(currentFloorMap?.rooms ?? []).map((room) => {
              const isSelected = selectedStartRoom?.id === room.id || selectedDestinationRoom?.id === room.id;
              return (
                <TouchableOpacity
                  key={`room-selector-${room.id}`}
                  testID={`indoor.room.selector.${room.id}`}
                  style={[styles.roomChip, isSelected && styles.roomChipSelected]}
                  onPress={() => applyRoomSelection(room)}
                >
                  <Text style={[styles.roomChipText, isSelected && styles.roomChipTextSelected]}>{room.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  container: {
    height: "88%",
    backgroundColor: "#F8F7F5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  closeButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  closeText: {
    color: "#111827",
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  selectorRow: {
    gap: 8,
    paddingRight: 6,
  },
  selectorChip: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  selectorChipActive: {
    backgroundColor: "#912338",
    borderColor: "#912338",
  },
  selectorChipText: {
    fontWeight: "700",
    color: "#1F2937",
  },
  selectorChipTextActive: {
    color: "#FFFFFF",
  },
  flatFloorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  floorChip: {
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  floorChipActive: {
    borderColor: "#912338",
    backgroundColor: "rgba(145,35,56,0.12)",
  },
  floorChipText: {
    color: "#1F2937",
    fontWeight: "700",
  },
  floorChipTextActive: {
    color: "#912338",
  },
  selectionModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  modeButtonActive: {
    borderColor: "#912338",
    backgroundColor: "rgba(145,35,56,0.12)",
  },
  modeButtonText: {
    fontWeight: "700",
    color: "#334155",
  },
  modeButtonTextActive: {
    color: "#912338",
  },
  canvas: {
    height: 270,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    overflow: "hidden",
    backgroundColor: "#EEF2F7",
    position: "relative",
  },
  hallway: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  roomPolygon: {
    position: "absolute",
    backgroundColor: "#9CA3AF",
    borderColor: "#6B7280",
    borderWidth: 1,
    borderRadius: 2,
  },
  roomMarker: {
    position: "absolute",
    transform: [{ translateX: -18 }, { translateY: -10 }],
    minWidth: 36,
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  roomMarkerStart: {
    backgroundColor: "#0F766E",
  },
  roomMarkerDestination: {
    backgroundColor: "#912338",
  },
  roomMarkerText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  selectedSummary: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    gap: 3,
  },
  selectedText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
  },
  roomChipRow: {
    marginTop: 10,
    gap: 7,
    paddingRight: 4,
  },
  roomChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  roomChipSelected: {
    borderColor: "#912338",
    backgroundColor: "rgba(145,35,56,0.12)",
  },
  roomChipText: {
    color: "#1F2937",
    fontWeight: "700",
    fontSize: 12,
  },
  roomChipTextSelected: {
    color: "#912338",
  },
});