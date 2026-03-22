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
import { logSearchAbandoned, logSearchNoResults } from "../utils/analytics";

type Props = {
  buildings: BuildingChoice[];

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

  const [history, setHistory] = useState<BuildingChoice[]>([]);
  const [quickFilter, setQuickFilter] = useState<"Home" | "Library" | "Favorites" | null>(null);
  const lastNoResultsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!destFocused) setDestText(destination ? displayName(destination) : "");
  }, [destination, destFocused]);

  useEffect(() => {
    if (!startFocused) setStartText(start ? displayName(start) : "");
  }, [start, startFocused]);

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

  useEffect(() => {
    if (!destFocused || routeActive) return;
    if (destinationQuery.length < 2) return;
    if (suggestions.length > 0) return;

    const key = `destination:${destinationQuery}`;
    if (lastNoResultsKeyRef.current === key) return;

    lastNoResultsKeyRef.current = key;
    logSearchNoResults(destinationQuery.length, "destination");
  }, [destFocused, routeActive, destinationQuery, suggestions.length]);

  useEffect(() => {
    if (!startFocused || routeActive) return;
    if (startQuery.length < 2) return;
    if (startSuggestions.length > 0) return;

    const key = `start:${startQuery}`;
    if (lastNoResultsKeyRef.current === key) return;

    lastNoResultsKeyRef.current = key;
    logSearchNoResults(startQuery.length, "start");
  }, [startFocused, routeActive, startQuery, startSuggestions.length]);

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
    setDestFocused(false);
    Keyboard.dismiss();
  }

  function pickStart(b: BuildingChoice) {
    onChangeStart(b);
    setStartText(displayName(b));
    setStartFocused(false);
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
                onBlur={() => {
                  setStartFocused(false);
                  if (
                    !routeActive &&
                    startQuery.length >= 2 &&
                    startSuggestions.length === 0 &&
                    !start
                  ) {
                    logSearchAbandoned(startQuery.length, "start");
                  }
                }}
                onChangeText={(t) => {
                  setStartText(t);
                  onChangeStart(null);
                }}
                returnKeyType="search"
              />
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
                onBlur={() => {
                  setDestFocused(false);
                  if (
                    !routeActive &&
                    destinationQuery.length >= 2 &&
                    suggestions.length === 0 &&
                    !destination
                  ) {
                    logSearchAbandoned(destinationQuery.length, "destination");
                  }
                }}
                onChangeText={(t) => {
                  setDestText(t);
                  onChangeDestination(null);
                }}
                returnKeyType="search"
              />
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
              const isCurrentLocation = !start || start.id === "current-location";

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
