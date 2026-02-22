import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView, Keyboard, TouchableWithoutFeedback } from "react-native";

import { FontAwesome } from "@expo/vector-icons";
import { styles, MAROON, MUTED } from "../styles/searchBar.styles";
import TransportModeSelector from "./TransportModeSelector";
import type { TransportMode } from "../hooks/useDirections";

export type BuildingChoice = {
  id: string;
  name: string;
  code?: string;
  address?: string;
  coordinate: { latitude: number; longitude: number };
  campus?: "SGW" | "Loyola";
  category?: "Home" | "Library" | "Favorites";
};

type Props = {
  buildings: BuildingChoice[];

  start: BuildingChoice | null; // null => current location
  destination: BuildingChoice | null;

  onChangeStart: (b: BuildingChoice | null) => void;
  onChangeDestination: (b: BuildingChoice | null) => void;

  transportMode: TransportMode;
  onChangeTransportMode: (mode: TransportMode) => void;

  routeActive: boolean;
  defaultExpanded?: boolean;

  onOpenBuilding?: (b: BuildingChoice) => void;
  onEndRoute?: () => void;
  onStartRoute?: () => void;
  onPreviewRoute?: () => void;
  onExitPreview?: () => void;
  previewActive?: boolean;
};

function stripCodePrefix(name: string, code?: string) {
  if (!code) return name?.trim() ?? "";
  const n = (name ?? "").trim();
  const pattern = new RegExp(`^${code}\\s*[-—:]\\s*`, "i");
  return n.replace(pattern, "").trim();
}

function displayName(b: { name: string; code?: string }) {
  const clean = stripCodePrefix(b.name, b.code);
  return b.code ? `${clean} (${b.code})` : clean;
}

function makeHaystack(b: BuildingChoice) {
  return `${stripCodePrefix(b.name, b.code)} ${b.code ?? ""} ${b.address ?? ""}`.toLowerCase();
}

export default function SearchBar({
  buildings,
  start,
  destination,
  onChangeStart,
  onChangeDestination,
  transportMode,
  onChangeTransportMode,
  routeActive,
  defaultExpanded = false,
  onOpenBuilding,
  onEndRoute,
  onStartRoute,
  onPreviewRoute,
  onExitPreview,
  previewActive = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");

  const [destText, setDestText] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const destInputRef = useRef<TextInput>(null);

  const [startText, setStartText] = useState("");
  const [startFocused, setStartFocused] = useState(false);
  const startInputRef = useRef<TextInput>(null);

  const [history, setHistory] = useState<BuildingChoice[]>([]);
  const [quickFilter, setQuickFilter] = useState<"Home" | "Library" | "Favorites">("Home");

  useEffect(() => {
    if (!destFocused) {
      if (!destination) { setDestText(""); }
      else { setDestText(displayName(destination)); }
    }
  }, [destination, destFocused]);

  useEffect(() => {
    if (!startFocused) {
      if (!start) { setStartText(""); }
      else { setStartText(displayName(start)); }
    }
  }, [start, startFocused]);

  const destinationQuery = destText.trim().toLowerCase();
  const startQuery = startText.trim().toLowerCase();

  const campusFiltered = useMemo(
    () => buildings.filter((b) => !b.campus || b.campus === campus),
    [buildings, campus]
  );

  const suggestions = useMemo(() => {
    if (!expanded || !destFocused || !destinationQuery || routeActive) return [];
    return campusFiltered.filter((b) => makeHaystack(b).includes(destinationQuery)).slice(0, 10);
  }, [expanded, campusFiltered, destFocused, destinationQuery, routeActive]);

  const startSuggestions = useMemo(() => {
    if (!expanded || !startFocused || !startQuery || routeActive) return [];
    return campusFiltered.filter((b) => makeHaystack(b).includes(startQuery)).slice(0, 10);
  }, [expanded, campusFiltered, startFocused, startQuery, routeActive]);

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
  }

  function pickStart(b: BuildingChoice) {
    onChangeStart(b);
    setStartText(displayName(b));
    setStartFocused(false);
  }

  const filteredHistory = useMemo(() => {
    const base = history.filter((h) => !h.campus || h.campus === campus);
    const hasCategories = base.some((b) => b.category);
    if (!hasCategories) return base;
    return base.filter((b) => b.category === quickFilter);
  }, [history, campus, quickFilter]);

  if (!expanded) {
    return (
      <View style={styles.wrapperCollapsed} pointerEvents="box-none">
        <TouchableOpacity
          testID="searchbar.open"
          activeOpacity={0.9}
          style={styles.collapsedBar}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Search buildings, rooms"
        >
          <View style={styles.leftIconMini}>
            <FontAwesome name="search" size={16} color={MAROON} aria-hidden />
          </View>
          <Text style={styles.collapsedPlaceholder}>Search buildings, rooms...</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const Separator = () => <View style={styles.sep} />

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.fullscreenOverlay} pointerEvents="auto">
        <SafeAreaView style={styles.sheet}>
          {/* header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                setExpanded(false);
                setDestFocused(false);
                setStartFocused(false);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.headerBack}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Route</Text>
          </View>

          {/* campus */}
          <View style={styles.segmentOuter}>
            <TouchableOpacity
              style={[styles.segmentBtn, campus === "SGW" && styles.segmentBtnActive]}
              onPress={() => setCampus("SGW")}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityState={{ selected: campus === "SGW" }}
              accessibilityLabel="SGW Campus"
            >
              <Text style={[styles.segmentText, campus === "SGW" && styles.segmentTextActive]}>SGW Campus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, campus === "Loyola" && styles.segmentBtnActive]}
              onPress={() => setCampus("Loyola")}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityState={{ selected: campus === "Loyola" }}
              accessibilityLabel="Loyola Campus"
            >
              <Text
                style={[styles.segmentText, campus === "Loyola" && styles.segmentTextActive]}
              >
                Loyola Campus
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeCard}>
            <Text style={styles.sectionLabel}>START POINT</Text>

            <TouchableOpacity style={styles.inputRow} activeOpacity={1} onPress={() => startInputRef.current?.focus()} accessibilityRole="button">
              <View style={styles.leftIconCircle}>
                <FontAwesome name="map-marker" size={16} color={MAROON} aria-hidden />
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
                  onChangeStart(null);
                }}
                returnKeyType="search"
              />
            </TouchableOpacity>

            {startSuggestions.length > 0 && (
              <View testID="route.start.suggestions" style={styles.suggestionsBox}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={startSuggestions}
                  keyExtractor={(b) => b.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.suggestionItem} onPress={() => pickStart(item)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Select ${displayName(item)}`}>
                      <Text style={styles.suggestionTitle}>{displayName(item)}</Text>
                      {!!item.address && <Text style={styles.suggestionSub}>{item.address}</Text>}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={Separator}
                />
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
                <FontAwesome name="search" size={16} color={MAROON} aria-hidden />
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
                  onChangeDestination(null);
                }}
                returnKeyType="search"
              />
            </TouchableOpacity>

            {suggestions.length > 0 && (
              <View testID="route.dest.suggestions" style={styles.suggestionsBox}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={suggestions}
                  keyExtractor={(b) => b.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.suggestionItem} onPress={() => pickDestination(item)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Select ${displayName(item)}`}>
                      <Text style={styles.suggestionTitle}>{displayName(item)}</Text>
                      {!!item.address && <Text style={styles.suggestionSub}>{item.address}</Text>}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={Separator}
                />
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>MODE OF TRANSPORT</Text>
            <TransportModeSelector
              selectedMode={transportMode}
              onModeSelect={onChangeTransportMode}
              disabled={routeActive}
            />

            {routeActive && onEndRoute && (
              <TouchableOpacity
                testID="route.end.button"
                style={styles.endRouteButton}
                activeOpacity={0.9}
                accessibilityRole="button"
                onPress={() => {
                  onEndRoute();
                  setStartText("");
                  setDestText("");
                  setDestFocused(false);
                }}
              >
                <Text style={styles.endRouteButtonText}>End Directions</Text>
              </TouchableOpacity>
            )}

            {!routeActive && destination && !start && onStartRoute && (
              <TouchableOpacity
                testID="route.start.button"
                style={styles.startRouteButton}
                activeOpacity={0.9}
                onPress={() => {
                  onStartRoute();
                  setExpanded(false);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.startRouteButtonText}>Start Directions</Text>
              </TouchableOpacity>
            )}

            {!routeActive && destination && start && (
              previewActive ? (
                <TouchableOpacity
                  testID="route.exit-preview.button"
                  style={styles.endRouteButton}
                  activeOpacity={0.9}
                  onPress={() => {
                    onExitPreview?.();
                    setExpanded(false);
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
                      setExpanded(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.previewRouteButtonText}>Preview Route</Text>
                  </TouchableOpacity>
                )
              )
            )}
          </View>

          {/* filters */}
          <View style={styles.filterRow}>
            {(["Home", "Library", "Favorites"] as const).map((k) => {
              const active = quickFilter === k;
              return (
                <TouchableOpacity
                  key={k}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setQuickFilter(k)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${k} filter`}
                >
                  <FontAwesome
                    name={k === "Home" ? "home" : k === "Library" ? "book" : "star"}
                    size={16}
                    color={active ? MAROON : MUTED}
                    aria-hidden
                  />
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Suggested Buildings</Text>
            <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="See all suggested buildings">
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* list */}
          <View style={styles.listCard}>
            {filteredHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No recent destinations yet</Text>
                <Text style={styles.emptySub}>Search a building above and it will show here.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredHistory}
                keyExtractor={(b) => b.id}
                ItemSeparatorComponent={Separator}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.buildingRow} activeOpacity={0.9} onPress={() => pickDestination(item)} accessibilityRole="button" accessibilityLabel={`Select ${displayName(item)}`}>
                    <View style={styles.buildingIconBox}>
                      <FontAwesome name="building-o" size={16} color={MAROON} aria-hidden />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.buildingName}>{displayName(item)}</Text>
                      {!!item.address && <Text style={styles.buildingSub}>{item.address}</Text>}
                    </View>

                    <TouchableOpacity style={styles.chevBtn} activeOpacity={0.85} onPress={() => onOpenBuilding?.(item)} accessibilityRole="button" accessibilityLabel={`View details for ${displayName(item)}`}>
                      <Text style={styles.rowChev} aria-hidden>›</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}