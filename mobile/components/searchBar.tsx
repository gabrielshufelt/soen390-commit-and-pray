import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles } from "../styles/searchBar.styles";
import {
  IconPin,
  IconSearch,
  IconBuilding,
  IconHome,
  IconLibrary,
  IconStar,
} from "../icons/searchBar.icons";

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
  start: BuildingChoice | null;
  destination: BuildingChoice | null;
  onChangeStart: (b: BuildingChoice | null) => void;
  onChangeDestination: (b: BuildingChoice | null) => void;
  routeActive: boolean;
  defaultExpanded?: boolean;
  onOpenBuilding?: (b: BuildingChoice) => void;
  onEndRoute?: () => void;
  onStartRoute?: () => void;
};

function stripCodePrefix(name: string, code?: string) {
  if (!code) return name?.trim() ?? "";
  const n = (name ?? "").trim();
  const pattern = new RegExp(`^${code}\\s*[-—:]\\s*`, "i");
  return n.replace(pattern, "").trim();
}

function displayName(b: { name: string; code?: string }) {
  if (!b.code) return b.name;
  const clean = stripCodePrefix(b.name, b.code);
  const alreadyHasCode = clean.trim().endsWith(`(${b.code})`);
  return alreadyHasCode ? clean : `${clean} (${b.code})`;
}

function makeHaystack(b: BuildingChoice) {
  return `${stripCodePrefix(b.name, b.code)} ${b.code ?? ""} ${b.address ?? ""}`.toLowerCase();
}

const Separator = () => <View style={styles.sep} />;

export default function SearchBar({
  buildings,
  start,
  destination,
  onChangeStart,
  onChangeDestination,
  routeActive,
  defaultExpanded = false,
  onOpenBuilding,
  onEndRoute,
  onStartRoute,
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
  const [quickFilter, setQuickFilter] =
    useState<"Home" | "Library" | "Favorites">("Home");

  useEffect(() => {
    if (!destFocused) {
      if (!destination) setDestText("");
      else setDestText(displayName(destination));
    }
  }, [destination, destFocused]);

  useEffect(() => {
    if (!startFocused) {
      if (!start) setStartText("");
      else setStartText(displayName(start));
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
    return campusFiltered
      .filter((b) => makeHaystack(b).includes(destinationQuery))
      .slice(0, 10);
  }, [expanded, campusFiltered, destFocused, destinationQuery, routeActive]);

  const startSuggestions = useMemo(() => {
    if (!expanded || !startFocused || !startQuery || routeActive) return [];
    return campusFiltered
      .filter((b) => makeHaystack(b).includes(startQuery))
      .slice(0, 10);
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
        >
          <View style={styles.leftIconMini}>
            <IconSearch size={18} />
          </View>
          <Text style={styles.collapsedPlaceholder}>
            Search buildings, rooms...
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.fullscreenOverlay} pointerEvents="auto">
      <SafeAreaView style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              setExpanded(false);
              setDestFocused(false);
              setStartFocused(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.headerBack}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Route</Text>

          <View style={styles.headerRightBtn} />
        </View>

        {/* START FIELD */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionLabel}>START POINT</Text>

          <TouchableOpacity
            style={styles.inputRow}
            activeOpacity={1}
            onPress={() => startInputRef.current?.focus()}
          >
            <View style={styles.leftIconCircle}>
              <IconPin size={18} />
            </View>

            <TextInput
              testID="route.start.input"
              ref={startInputRef}
              style={styles.destInput}
              value={startText}
              editable={!routeActive}
              placeholder="Current Location"
              onFocus={() => setStartFocused(true)}
              onBlur={() => setStartFocused(false)}
              onChangeText={(t) => {
                setStartText(t);
                onChangeStart(null);
              }}
            />
          </TouchableOpacity>

          {startSuggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={startSuggestions}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => pickStart(item)}
                  >
                    <Text style={styles.suggestionTitle}>
                      {displayName(item)}
                    </Text>
                    {!!item.address && (
                      <Text style={styles.suggestionSub}>
                        {item.address}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={Separator}
              />
            </View>
          )}

          {/* DESTINATION FIELD */}
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
            DESTINATION
          </Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => destInputRef.current?.focus()}
            style={[styles.inputRow, styles.destRow]}
          >
            <View style={styles.leftIconCircleAlt}>
              <IconSearch size={18} />
            </View>

            <TextInput
              testID="route.dest.input"
              ref={destInputRef}
              style={styles.destInput}
              value={destText}
              editable={!routeActive}
              placeholder="Where to?"
              onFocus={() => setDestFocused(true)}
              onBlur={() => setDestFocused(false)}
              onChangeText={(t) => {
                setDestText(t);
                onChangeDestination(null);
              }}
            />
          </TouchableOpacity>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => pickDestination(item)}
                  >
                    <Text style={styles.suggestionTitle}>
                      {displayName(item)}
                    </Text>
                    {!!item.address && (
                      <Text style={styles.suggestionSub}>
                        {item.address}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={Separator}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
