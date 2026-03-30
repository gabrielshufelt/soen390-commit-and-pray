import type { MapViewDirectionsMode } from "react-native-maps-directions";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { BuildingChoice } from "@/constants/searchBar.types";
import { useShuttleAvailability } from "../hooks/useShuttleAvailability";
import { styles, MAROON, MUTED, TEXT } from "../styles/searchBar.styles";
import TransportModeSelector from "./TransportModeSelector";
import { stripCodePrefix, displayName, makeHaystack } from "@/constants/searchBar.utils";
import { useWatchLocation } from "../hooks/useWatchLocation";
import { useUserBuilding } from "../hooks/useUserBuilding";
import { searchNearbyPois, POI_TYPE_MAP } from "../utils/poiSearch";

type Props = {
  buildings: BuildingChoice[];
  roomOptionsByBuilding: Record<string, string[]>;

  start: BuildingChoice | null; // null => current location
  destination: BuildingChoice | null;

  onChangeStart: (b: BuildingChoice | null) => void;
  onChangeDestination: (b: BuildingChoice | null) => void;

  transportMode: MapViewDirectionsMode;
  onChangeTransportMode: (mode: MapViewDirectionsMode) => void;

  routeActive: boolean;

  onOpenBuilding?: (b: BuildingChoice) => void;
  onStartRoute?: () => void;
  onEndRoute?: () => void;
  onPreviewRoute?: () => void;
  onExitPreview?: () => void;
  previewActive?: boolean;

  previewRouteInfo?: {
    distanceText: string | null;
    durationText: string | null;
  };

  useShuttle?: boolean;
  onUseShuttleChange?: (active: boolean) => void;

  campus: "SGW" | "Loyola";
  onCampusSelect: (campus: "SGW" | "Loyola") => void;

  onClose: () => void;
};

type ShuttleCheckboxProps = {
  checked: boolean;
  available: boolean;
  nextDeparture: string | null;
  onToggle: () => void;
};

function ShuttleCheckbox({ checked, available, nextDeparture, onToggle }: ShuttleCheckboxProps) {
  return (
    <TouchableOpacity
      testID="shuttle.checkbox"
      style={[styles.shuttleRow, !available && styles.shuttleRowDisabled]}
      onPress={onToggle}
      disabled={!available}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !available }}
      accessibilityLabel="Use Concordia Shuttle"
    >
      <View style={[styles.shuttleCheckbox, checked && styles.shuttleCheckboxChecked]}>
        {checked && <Text style={styles.shuttleCheckboxTick}>✓</Text>}
      </View>

      <Text style={[styles.shuttleLabel, !available && styles.shuttleLabelDisabled]}>
        Use Concordia Shuttle
      </Text>

      {available && nextDeparture ? (
        <Text style={styles.shuttleNextDep}>Next: {nextDeparture}</Text>
      ) : (
        <Text style={styles.shuttleLabelDisabled}>No service</Text>
      )}
    </TouchableOpacity>
  );
}

export default function ExpandedSearchBar({
  buildings,
  roomOptionsByBuilding,
  start,
  destination,
  onChangeStart,
  onChangeDestination,
  transportMode,
  onChangeTransportMode,
  routeActive,
  onOpenBuilding,
  onStartRoute,
  onEndRoute,
  onPreviewRoute,
  onExitPreview,
  previewActive = false,
  previewRouteInfo,
  useShuttle = false,
  onUseShuttleChange,
  campus,
  onCampusSelect,
  onClose,
}: Props) {
  const [seeAllOpen, setSeeAllOpen] = useState(false);

  const shuttleAvailability = useShuttleAvailability(campus);

  const [destText, setDestText] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const destInputRef = useRef<TextInput>(null);

  const [startText, setStartText] = useState("");
  const [startFocused, setStartFocused] = useState(false);
  const startInputRef = useRef<TextInput>(null);

  const [startRoomText, setStartRoomText] = useState("");
  const [startRoomFocused, setStartRoomFocused] = useState(false);
  const startRoomInputRef = useRef<TextInput>(null);

  const [destRoomText, setDestRoomText] = useState("");
  const [destRoomFocused, setDestRoomFocused] = useState(false);
  const destRoomInputRef = useRef<TextInput>(null);

  const [history, setHistory] = useState<BuildingChoice[]>([]);
  const [quickFilter, setQuickFilter] = useState<"Home" | "Library" | "Favorites" | null>(null);

  useEffect(() => {
    if (!destFocused) setDestText(destination ? displayName(destination) : "");
  }, [destination, destFocused]);

  useEffect(() => {
    if (!startFocused) setStartText(start ? displayName(start) : "");
  }, [start, startFocused]);

  useEffect(() => {
    if (!startRoomFocused) {
      setStartRoomText(start?.room ?? "");
    }
  }, [start, startRoomFocused]);

  useEffect(() => {
    if (!destRoomFocused) {
      setDestRoomText(destination?.room ?? "");
    }
  }, [destination, destRoomFocused]);

  const sameCampus = !!(start && start.id !== "current-location" && destination && start.campus && destination.campus && start.campus === destination.campus);

  useEffect(() => {
    if (sameCampus && useShuttle) onUseShuttleChange?.(false);
  }, [sameCampus, useShuttle, onUseShuttleChange]);

  const destinationQuery = destText.trim().toLowerCase();
  const startQuery = startText.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!destFocused || !destinationQuery || routeActive) return [];
    return buildings.filter((b) => makeHaystack(b).includes(destinationQuery)).slice(0, 10);
  }, [buildings, destFocused, destinationQuery, routeActive]);

  const startSuggestions = useMemo(() => {
    if (!startFocused || !startQuery || routeActive) return [];
    return buildings.filter((b) => makeHaystack(b).includes(startQuery)).slice(0, 10);
  }, [buildings, startFocused, startQuery, routeActive]);

  const startRoomSuggestions = useMemo(() => {
    const buildingCode = start?.code?.toUpperCase();
    if (!buildingCode || !startRoomFocused || routeActive) return [];
    const options = roomOptionsByBuilding[buildingCode] ?? [];
    const query = startRoomText.trim().toLowerCase();
    if (!query) return options.slice(0, 10);
    return options.filter((room) => room.toLowerCase().includes(query)).slice(0, 10);
  }, [start, startRoomFocused, routeActive, roomOptionsByBuilding, startRoomText]);

  const destRoomSuggestions = useMemo(() => {
    const buildingCode = destination?.code?.toUpperCase();
    if (!buildingCode || !destRoomFocused || routeActive) return [];
    const options = roomOptionsByBuilding[buildingCode] ?? [];
    const query = destRoomText.trim().toLowerCase();
    if (!query) return options.slice(0, 10);
    return options.filter((room) => room.toLowerCase().includes(query)).slice(0, 10);
  }, [destination, destRoomFocused, routeActive, roomOptionsByBuilding, destRoomText]);

  const { location } = useWatchLocation();
  const currentBuilding = useUserBuilding(location);

  const poiResults = useMemo(() => {
    const query = destText.toLowerCase().trim();
    const keywords = Object.keys(POI_TYPE_MAP);

    if (destFocused && keywords.includes(query) && location) {
      return searchNearbyPois(
        query,
        location.coords.latitude,
        location.coords.longitude,
        currentBuilding?.code || null
      );
    }
    return [];
  }, [destText, destFocused, currentBuilding, location]);

  function addToHistory(b: BuildingChoice) {
    setHistory((prev) => {
      const without = prev.filter((x) => x.id !== b.id);
      return [b, ...without].slice(0, 20);
    });
  }

  function pickDestination(b: BuildingChoice) {
    onChangeDestination(b);
    addToHistory(b);
    setDestText(displayName(b));
    setDestRoomText(b.room && !b.room.includes("_") ? b.room : "");
    setDestFocused(false);
    Keyboard.dismiss();
  }

  function pickStart(b: BuildingChoice) {
    onChangeStart(b);
    setStartText(displayName(b));
    setStartRoomText(b.room && !b.room.includes("_") ? b.room : "");
    setStartFocused(false);
    Keyboard.dismiss();
  }

  function pickStartRoom(room: string) {
    if (!start) return;
    onChangeStart({ ...start, room });
    setStartRoomText(room);
    setStartRoomFocused(false);
    Keyboard.dismiss();
  }

  function pickDestinationRoom(room: string) {
    if (!destination) return;
    onChangeDestination({ ...destination, room });
    setDestRoomText(room);
    setDestRoomFocused(false);
    Keyboard.dismiss();
  }

  const filteredHistory = useMemo(() => {
    const hasCategories = history.some((b) => b.category);
    if (!hasCategories || quickFilter === null) return history;
    return history.filter((b) => b.category === quickFilter);
  }, [history, quickFilter]);

  const seeAllBuildings = useMemo(() => {
    return [...buildings].sort((a, b) =>
      stripCodePrefix(a.name, a.code).localeCompare(stripCodePrefix(b.name, b.code))
    );
  }, [buildings]);

  const Separator = () => <View style={styles.sep} />;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.fullscreenOverlay} pointerEvents="auto">
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                onClose();
                Keyboard.dismiss();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.headerBack}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Route</Text>

          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
          {/* Route card */}
          <View style={styles.routeCard}>
            <Text style={styles.sectionLabel}>START POINT</Text>

            <TouchableOpacity
              style={styles.inputRow}
              activeOpacity={1}
              onPress={() => startInputRef.current?.focus()}
              accessibilityRole="button"
            >
              <View style={styles.leftIconCircle}>
                <FontAwesome name="map-marker" size={16} color={MAROON} />
              </View>

              <TextInput
                testID="route.start.input"
                ref={startInputRef}
                style={styles.destInput}
                value={startText}
                editable={!routeActive}
                placeholder="Current Location"
                placeholderTextColor="#9CA3AF"
                onFocus={() => setStartFocused(true)}
                onBlur={() => setStartFocused(false)}
                onChangeText={(t) => {
                  setStartText(t);
                }}
                returnKeyType="search"
              />
              {startText.length > 0 && !routeActive && (
                <TouchableOpacity
                  onPress={() => { setStartText(""); onChangeStart(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear start"
                >
                  <FontAwesome name="times-circle" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {startSuggestions.length > 0 && (
              <View testID="route.start.suggestions" style={styles.suggestionsBox}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {startSuggestions.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      {idx > 0 && <Separator />}
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => pickStart(item)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <Text style={styles.suggestionTitle}>{displayName(item)}</Text>
                        <Text style={styles.suggestionSub}>
                          {item.campus ? `${item.campus} Campus` : ""}{item.address ? (item.campus ? ` · ${item.address}` : item.address) : ""}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </ScrollView>
              </View>
            )}

            {!!start?.code && start.id !== "current-location" && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>START ROOM (OPTIONAL)</Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  activeOpacity={1}
                  onPress={() => startRoomInputRef.current?.focus()}
                  accessibilityRole="button"
                >
                  <View style={styles.leftIconCircleAlt}>
                    <FontAwesome name="hashtag" size={14} color={MAROON} />
                  </View>

                  <TextInput
                    testID="route.start.room.input"
                    ref={startRoomInputRef}
                    style={styles.destInput}
                    value={startRoomText}
                    editable={!routeActive}
                    placeholder={`Room in ${start.code} (e.g. 920)`}
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setStartRoomFocused(true)}
                    onBlur={() => setStartRoomFocused(false)}
                    onChangeText={(t) => {
                      setStartRoomText(t);
                      if (!start) return;
                      onChangeStart({ ...start, room: t.trim() || undefined });
                    }}
                    returnKeyType="done"
                  />
                  {startRoomText.length > 0 && !routeActive && (
                    <TouchableOpacity
                      onPress={() => { setStartRoomText(""); if (start) onChangeStart({ ...start, room: undefined }); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Clear start room"
                    >
                      <FontAwesome name="times-circle" size={16} color={MUTED} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {startRoomSuggestions.length > 0 && (
                  <View testID="route.start.room.suggestions" style={styles.suggestionsBox}>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {startRoomSuggestions.map((room, idx) => (
                        <React.Fragment key={`${start.code}-${room}`}>
                          {idx > 0 && <Separator />}
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => pickStartRoom(room)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                          >
                            <Text style={styles.suggestionTitle}>{room}</Text>
                            <Text style={styles.suggestionSub}>{start.code} room</Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>DESTINATION</Text>

            <TouchableOpacity
              activeOpacity={1}
              onPress={() => destInputRef.current?.focus()}
              style={[styles.inputRow, styles.destRow]}
              accessibilityRole="button"
            >
              <View style={styles.leftIconCircleAlt}>
                <FontAwesome name="search" size={16} color={MAROON} />
              </View>

              <TextInput
                testID="route.dest.input"
                ref={destInputRef}
                style={styles.destInput}
                value={destText}
                editable={!routeActive}
                placeholder="Where to?"
                placeholderTextColor="#9CA3AF"
                onFocus={() => setDestFocused(true)}
                onBlur={() => setDestFocused(false)}
                onChangeText={(t) => {
                  setDestText(t);
                }}
                returnKeyType="search"
              />
              {destText.length > 0 && !routeActive && (
                <TouchableOpacity
                  onPress={() => { setDestText(""); onChangeDestination(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear destination"
                >
                  <FontAwesome name="times-circle" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {suggestions.length > 0 && (
              <View testID="route.dest.suggestions" style={styles.suggestionsBox}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {suggestions.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      {idx > 0 && <Separator />}
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => pickDestination(item)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <Text style={styles.suggestionTitle}>{displayName(item)}</Text>
                        <Text style={styles.suggestionSub}>
                          {item.campus ? `${item.campus} Campus` : ""}{item.address ? (item.campus ? ` · ${item.address}` : item.address) : ""}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </ScrollView>
              </View>
            )}

            {poiResults.length > 0 && (
              <View testID="route.dest.poi-suggestions" style={styles.suggestionsBox}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {poiResults.map((poi, idx) => (
                    <React.Fragment key={poi.id}>
                      {idx > 0 && <Separator />}
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() =>
                          pickDestination({
                            id: poi.id,
                            name: poi.name,
                            code: poi.buildingCode,
                            room: poi.id,
                            coordinate: poi.coordinates,
                          })
                        }
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <Text style={styles.suggestionTitle}>
                          {poi.name} — Floor {poi.floor}
                        </Text>
                        <Text style={styles.suggestionSub}>
                          {poi.buildingCode} · {Math.round(poi.distance)}m away
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </ScrollView>
              </View>
            )}

            {!!destination?.code && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>DESTINATION ROOM (OPTIONAL)</Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  activeOpacity={1}
                  onPress={() => destRoomInputRef.current?.focus()}
                  accessibilityRole="button"
                >
                  <View style={styles.leftIconCircleAlt}>
                    <FontAwesome name="hashtag" size={14} color={MAROON} />
                  </View>

                  <TextInput
                    testID="route.dest.room.input"
                    ref={destRoomInputRef}
                    style={styles.destInput}
                    value={destRoomText}
                    editable={!routeActive}
                    placeholder={`Room in ${destination.code} (e.g. 3.255)`}
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setDestRoomFocused(true)}
                    onBlur={() => setDestRoomFocused(false)}
                    onChangeText={(t) => {
                      setDestRoomText(t);
                      if (!destination) return;
                      onChangeDestination({ ...destination, room: t.trim() || undefined });
                    }}
                    returnKeyType="done"
                  />
                  {destRoomText.length > 0 && !routeActive && (
                    <TouchableOpacity
                      onPress={() => { setDestRoomText(""); if (destination) onChangeDestination({ ...destination, room: undefined }); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Clear destination room"
                    >
                      <FontAwesome name="times-circle" size={16} color={MUTED} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {destRoomSuggestions.length > 0 && (
                  <View testID="route.dest.room.suggestions" style={styles.suggestionsBox}>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {destRoomSuggestions.map((room, idx) => (
                        <React.Fragment key={`${destination.code}-${room}`}>
                          {idx > 0 && <Separator />}
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => pickDestinationRoom(room)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                          >
                            <Text style={styles.suggestionTitle}>{room}</Text>
                            <Text style={styles.suggestionSub}>{destination.code} room</Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>MODE OF TRANSPORT</Text>

            <TransportModeSelector
              selectedMode={transportMode}
              onModeSelect={(mode) => {
                onChangeTransportMode(mode);
                if (mode !== "TRANSIT" && useShuttle) onUseShuttleChange?.(false);
              }}
              disabled={routeActive}
            />

            {transportMode === "TRANSIT" && (
              <ShuttleCheckbox
                checked={useShuttle}
                available={shuttleAvailability.available && !sameCampus}
                nextDeparture={sameCampus ? null : shuttleAvailability.nextDeparture}
                onToggle={() => onUseShuttleChange?.(!useShuttle)}
              />
            )}

            {transportMode === "TRANSIT" && sameCampus && (
              <Text style={[styles.shuttleLabelDisabled, { marginTop: 4, marginLeft: 4, fontSize: 12 }]}>
                Shuttle is only available between SGW and Loyola campuses.
              </Text>
            )}

            {!routeActive && destination && previewRouteInfo?.durationText && (
              <View style={styles.timeEstimateCard}>
                <Text style={styles.timeEstimateLabel}>Estimated Time</Text>
                <Text style={styles.timeEstimateValue}>
                  {previewRouteInfo.durationText}
                  {previewRouteInfo.distanceText && (
                    <Text style={styles.timeEstimateDistance}> • {previewRouteInfo.distanceText}</Text>
                  )}
                </Text>
              </View>
            )}

            {routeActive && onEndRoute && (
              <TouchableOpacity
                testID="route.end.button"
                style={styles.endRouteButton}
                activeOpacity={0.9}
                onPress={onEndRoute}
                accessibilityRole="button"
              >
                <Text style={styles.endRouteButtonText}>End Directions</Text>
              </TouchableOpacity>
            )}

            {(() => {
              const isCurrentLocation =
                !start ||
                start.id === "current-location" ||
                start.id === currentBuilding?.id;

              if (!routeActive && destination && isCurrentLocation && onStartRoute) {
                return (
                  <TouchableOpacity
                    testID="route.start.button"
                    style={styles.startRouteButton}
                    activeOpacity={0.9}
                    onPress={() => {
                      onStartRoute();
                      onClose();
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.startRouteButtonText}>Start Directions</Text>
                  </TouchableOpacity>
                );
              }

              if (!routeActive && destination && !isCurrentLocation) {
                return previewActive ? (
                  <TouchableOpacity
                    testID="route.exit-preview.button"
                    style={styles.endRouteButton}
                    activeOpacity={0.9}
                    onPress={() => {
                      onExitPreview?.();
                      onClose();
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.endRouteButtonText}>Exit Preview</Text>
                  </TouchableOpacity>
                ) : (
                  onPreviewRoute && (
                    <TouchableOpacity
                      testID="route.preview.button"
                      style={styles.previewRouteButton}
                      activeOpacity={0.9}
                      onPress={() => {
                        onPreviewRoute();
                        onClose();
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.previewRouteButtonText}>Preview Route</Text>
                    </TouchableOpacity>
                  )
                );
              }

              return null;
            })()}
          </View>

          {/* Quick filters */}
          <View style={styles.filterRow}>
            {(["Home", "Library", "Favorites"] as const).map((k) => {
              const active = quickFilter === k;
              return (
                <TouchableOpacity
                  key={k}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setQuickFilter(quickFilter === k ? null : k)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <FontAwesome
                    name={k === "Home" ? "home" : k === "Library" ? "book" : "star"}
                    size={16}
                    color={active ? MAROON : MUTED}
                  />
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Suggested Buildings */}
          <View style={styles.suggestedSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Suggested Buildings</Text>
              <TouchableOpacity
                activeOpacity={0.85} 
                accessibilityRole="button"
                accessibilityLabel="See all buildings"
                onPress={() => {
                  Keyboard.dismiss();
                  setSeeAllOpen(true);
                }}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {filteredHistory.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyTitle}>No recent destinations yet</Text>
                <Text style={styles.emptySub}>Search a building above and it will show here.</Text>
              </View>
            ) : (
              <View style={styles.suggestedListContent}>
                {filteredHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.buildingCard}
                    activeOpacity={0.9}
                    onPress={() => pickDestination(item)}
                    accessibilityRole="button"
                  >
                    <View style={styles.buildingRow}>
                      <View style={styles.buildingIconBox}>
                        <FontAwesome name="building-o" size={16} color={MAROON} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.buildingName}>{displayName(item)}</Text>
                        <Text style={styles.buildingSub}>
                          {item.campus ? `${item.campus} Campus` : ""}{item.address ? (item.campus ? ` · ${item.address}` : item.address) : ""}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.chevBtn}
                        activeOpacity={0.85}
                        onPress={() => onOpenBuilding?.(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`View details for ${displayName(item)}`}
                      >
                        <Text style={styles.rowChev}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          </ScrollView>

          {/* See All modal */}
          <Modal
            visible={seeAllOpen}
            animationType={Platform.OS === "ios" ? "slide" : "fade"}
            transparent={false}
            onRequestClose={() => setSeeAllOpen(false)}
          >
            <SafeAreaView style={styles.sheet}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => setSeeAllOpen(false)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.headerBack}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>All Buildings</Text>

                <View style={styles.headerBtnRight} />
              </View>

              <View style={styles.listCard}>
                <FlatList
                  data={seeAllBuildings}
                  keyExtractor={(b) => b.id}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  ItemSeparatorComponent={Separator}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.buildingRow}
                      activeOpacity={0.9}
                      onPress={() => {
                        pickDestination(item);
                        setSeeAllOpen(false);
                      }}
                      accessibilityRole="button"
                    >
                      <View style={styles.buildingIconBox}>
                        <FontAwesome name="building-o" size={16} color={MAROON} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.buildingName}>{displayName(item)}</Text>
                        <Text style={styles.buildingSub}>
                          {item.campus ? `${item.campus} Campus` : ""}{item.address ? (item.campus ? ` · ${item.address}` : item.address) : ""}
                        </Text>
                      </View>

                      <Text style={styles.rowChev}>›</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}
