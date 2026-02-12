import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  SafeAreaView,
} from "react-native";

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

  routeActive: boolean;
  defaultExpanded?: boolean;

  onOpenBuilding?: (b: BuildingChoice) => void; // arrow tap
  onEndRoute?: () => void;
};

const MAROON = "#912338";
const TEXT = "#111827";
const MUTED = "#6B7280";
const BORDER = "rgba(17, 24, 39, 0.10)";
const SURFACE = "rgba(255,255,255,0.96)";
const SHEET_BG = "#F7F3F1";
const CARD_BG = "#FFFFFF";

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

/** ----------------- “DRAWN” ICONS (no emoji) ----------------- **/
function IconPin({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={[iconStyles.circle, { width: s, height: s, borderRadius: s / 2 }]}>
      <View
        style={[
          iconStyles.pinDot,
          { width: s * 0.34, height: s * 0.34, borderRadius: (s * 0.34) / 2 },
        ]}
      />
      <View style={[iconStyles.pinStem, { width: s * 0.12, height: s * 0.48 }]} />
    </View>
  );
}

function IconSearch({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      <View
        style={[
          iconStyles.lens,
          { width: s * 0.62, height: s * 0.62, borderRadius: (s * 0.62) / 2 },
        ]}
      />
      <View style={[iconStyles.handle, { width: s * 0.42, height: s * 0.10, borderRadius: 99 }]} />
    </View>
  );
}

function IconBuilding({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={[iconStyles.building, { width: s, height: s, borderRadius: 6 }]}>
      <View style={iconStyles.buildingRow}>
        <View style={iconStyles.win} />
        <View style={iconStyles.win} />
      </View>
      <View style={iconStyles.buildingRow}>
        <View style={iconStyles.win} />
        <View style={iconStyles.win} />
      </View>
      <View style={iconStyles.buildingDoor} />
    </View>
  );
}

function IconHome({ active }: { active: boolean }) {
  return (
    <View style={iconStyles.chipIconBox}>
      <View style={[iconStyles.homeRoof, { borderBottomColor: active ? MAROON : MUTED }]} />
      <View style={[iconStyles.homeBody, { borderColor: active ? MAROON : MUTED }]} />
    </View>
  );
}

function IconLibrary({ active }: { active: boolean }) {
  return (
    <View style={iconStyles.chipIconBox}>
      <View style={[iconStyles.book, { borderColor: active ? MAROON : MUTED }]} />
      <View style={[iconStyles.bookLine, { backgroundColor: active ? MAROON : MUTED }]} />
    </View>
  );
}

function IconStar({ active }: { active: boolean }) {
  // glyph, not emoji
  return <Text style={{ fontSize: 14, color: active ? MAROON : MUTED, fontWeight: "900" }}>★</Text>;
}
/** ------------------------------------------------------------ **/

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
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");

  const [destText, setDestText] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const destInputRef = useRef<TextInput>(null);

  // local in-memory history (swap to AsyncStorage later if you want persistence)
  const [history, setHistory] = useState<BuildingChoice[]>([]);
  const [quickFilter, setQuickFilter] = useState<"Home" | "Library" | "Favorites">("Home");

  // IMPORTANT: do NOT auto-fill when opening screen (only show chosen destination after user picks)
  useEffect(() => {
    if (!destination) {
      if (!destFocused) setDestText("");
      return;
    }
    // only update the text if user is not typing
    if (!destFocused) setDestText(displayName(destination));
  }, [destination, destFocused]);

  const destinationQuery = destText.trim().toLowerCase();

  const campusFiltered = useMemo(() => {
    return buildings.filter((b) => !b.campus || b.campus === campus);
  }, [buildings, campus]);

  const suggestions = useMemo(() => {
    if (!expanded || !destFocused || !destinationQuery || routeActive) return [];
    return campusFiltered
      .filter((b) => {
        const hay = `${stripCodePrefix(b.name, b.code)} ${b.code ?? ""} ${b.address ?? ""}`.toLowerCase();
        return hay.includes(destinationQuery);
      })
      .slice(0, 10);
  }, [expanded, campusFiltered, destFocused, destinationQuery, routeActive]);

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

  const startLabel = start ? displayName(start) : "Current Location";

  const filteredHistory = useMemo(() => {
    const base = history.filter((h) => !h.campus || h.campus === campus);

    // if your history items don't have category, don't filter them out
    const hasCategories = base.some((b) => b.category);
    if (!hasCategories) return base;

    return base.filter((b) => b.category === quickFilter);
  }, [history, campus, quickFilter]);

  // ---------------- COLLAPSED (top bar only)
  if (!expanded) {
    return (
      <View style={styles.wrapperCollapsed} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.collapsedBar}
          onPress={() => {
            setExpanded(true);
            // ✅ NO AUTO-FOCUS: user must tap "Where to?"
          }}
        >
          <View style={styles.leftIconMini}>
            <IconSearch size={18} />
          </View>
          <Text style={styles.collapsedPlaceholder}>Search buildings, rooms...</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------- EXPANDED (full screen sheet)
  return (
    <View style={styles.fullscreenOverlay} pointerEvents="auto">
      <SafeAreaView style={styles.sheet}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              setExpanded(false);
              setDestFocused(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.headerBack}>‹</Text>
          </TouchableOpacity>

          {/* "Route" moved slightly left (match mock) */}
          <Text style={styles.headerTitle}>Route</Text>

          <TouchableOpacity style={styles.headerRightBtn} activeOpacity={0.85}>
            <Text style={styles.headerDots}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* campus segmented */}
        <View style={styles.segmentOuter}>
          <TouchableOpacity
            style={[styles.segmentBtn, campus === "SGW" && styles.segmentBtnActive]}
            onPress={() => setCampus("SGW")}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentText, campus === "SGW" && styles.segmentTextActive]}>SGW Campus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, campus === "Loyola" && styles.segmentBtnActive]}
            onPress={() => setCampus("Loyola")}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentText, campus === "Loyola" && styles.segmentTextActive]}>Loyola Campus</Text>
          </TouchableOpacity>
        </View>

        {/* route card */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionLabel}>START POINT</Text>
          <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => onChangeStart(null)}>
            <View style={styles.leftIconCircle}>
              <IconPin size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputTextStrong}>{startLabel}</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>DESTINATION</Text>

          {/* Make only "Where to?" clickable -> focus input */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => destInputRef.current?.focus()}
            style={[styles.inputRow, styles.destRow]}
          >
            <View style={styles.leftIconCircleAlt}>
              <IconSearch size={18} />
            </View>

            <TextInput
              ref={destInputRef}
              style={styles.destInput}
              value={destText}
              editable={!routeActive}
              placeholder="Where to?"
              placeholderTextColor="rgba(17,24,39,0.35)"
              onFocus={() => setDestFocused(true)}
              onBlur={() => setDestFocused(false)}
              onChangeText={(t) => {
                setDestText(t);
                onChangeDestination(null);
              }}
              returnKeyType="search"
            />
          </TouchableOpacity>

          {/* suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => pickDestination(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.suggestionTitle}>{displayName(item)}</Text>
                    {!!item.address && <Text style={styles.suggestionSub}>{item.address}</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />
            </View>
          )}

          {routeActive && onEndRoute && (
            <TouchableOpacity
              style={styles.endRouteButton}
              activeOpacity={0.9}
              onPress={() => {
                onEndRoute();
                setDestText("");
                setDestFocused(false);
              }}
            >
              <Text style={styles.endRouteButtonText}>End Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* filter chips */}
        <View style={styles.filterRow}>
          {(["Home", "Library", "Favorites"] as const).map((k) => {
            const active = quickFilter === k;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setQuickFilter(k)}
                activeOpacity={0.9}
              >
                {k === "Home" ? (
                  <IconHome active={active} />
                ) : k === "Library" ? (
                  <IconLibrary active={active} />
                ) : (
                  <IconStar active={active} />
                )}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Suggested Buildings</Text>
          <TouchableOpacity activeOpacity={0.85}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* HISTORY ONLY */}
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
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.buildingRow} activeOpacity={0.9} onPress={() => pickDestination(item)}>
                  <View style={styles.buildingIconBox}>
                    <IconBuilding size={18} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.buildingName}>{displayName(item)}</Text>
                    {!!item.address && <Text style={styles.buildingSub}>{item.address}</Text>}
                  </View>

                  <TouchableOpacity
                    style={styles.chevBtn}
                    activeOpacity={0.85}
                    onPress={() => onOpenBuilding?.(item)}
                  >
                    <Text style={styles.rowChev}>›</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperCollapsed: {
    position: "absolute",
    top: Platform.OS === "ios" ? 62 : 48,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },

  collapsedBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  leftIconMini: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(145,35,56,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  collapsedPlaceholder: { flex: 1, fontWeight: "800", color: "rgba(17,24,39,0.45)" },

  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: SHEET_BG,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
  },

  // ✅ Header now positions dots absolutely on the right, and nudges title left
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    position: "relative",
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerRightBtn: { position: "absolute", right: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerBack: { fontSize: 26, color: TEXT, opacity: 0.85 },
  headerDots: { fontSize: 18, color: TEXT, opacity: 0.75 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: TEXT, marginLeft: 6 },

  segmentOuter: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  segmentBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  segmentBtnActive: { backgroundColor: CARD_BG },
  segmentText: { fontWeight: "800", color: MUTED },
  segmentTextActive: { color: MAROON },

  routeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: MUTED,
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F7F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  destRow: { borderColor: "rgba(145,35,56,0.25)", backgroundColor: "#FFFFFF" },

  leftIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(145,35,56,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  leftIconCircleAlt: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(145,35,56,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  inputTextStrong: { fontSize: 15, fontWeight: "900", color: TEXT },
  destInput: { flex: 1, fontSize: 15, fontWeight: "800", color: TEXT, paddingVertical: 0 },

  suggestionsBox: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    maxHeight: 220,
  },
  endRouteButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(145,35,56,0.10)",
    borderWidth: 1,
    borderColor: "rgba(145,35,56,0.35)",
  },
  endRouteButtonText: {
    fontWeight: "900",
    color: MAROON,
    letterSpacing: 0.3,
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12 },
  suggestionTitle: { fontWeight: "900", color: TEXT },
  suggestionSub: { marginTop: 3, color: MUTED, fontSize: 12, fontWeight: "700" },

  filterRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 10 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: { borderColor: "rgba(145,35,56,0.35)", backgroundColor: "rgba(145,35,56,0.08)" },
  filterText: { fontWeight: "900", color: TEXT, opacity: 0.85 },
  filterTextActive: { color: MAROON, opacity: 1 },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  listTitle: { fontSize: 16, fontWeight: "900", color: TEXT },
  seeAll: { fontSize: 13, fontWeight: "900", color: MAROON },

  listCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyState: { padding: 18 },
  emptyTitle: { fontWeight: "900", color: TEXT, fontSize: 14 },
  emptySub: { marginTop: 6, color: MUTED, fontWeight: "700", fontSize: 12 },

  buildingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  buildingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(145,35,56,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  buildingName: { fontSize: 14, fontWeight: "900", color: TEXT },
  buildingSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: MUTED },

  chevBtn: { paddingLeft: 10, paddingVertical: 6 },
  rowChev: { fontSize: 22, opacity: 0.6 },

  sep: { height: 1, backgroundColor: BORDER, marginLeft: 14, marginRight: 14 },
});

const iconStyles = StyleSheet.create({
  circle: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  // pin
  pinDot: {
    backgroundColor: MAROON,
    marginBottom: 2,
  },
  pinStem: {
    backgroundColor: "rgba(145,35,56,0.65)",
    borderRadius: 99,
  },

  // search
  lens: {
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.50)",
    position: "absolute",
    left: 0,
    top: 0,
  },
  handle: {
    backgroundColor: "rgba(17,24,39,0.50)",
    position: "absolute",
    right: 0,
    bottom: 2,
    transform: [{ rotate: "45deg" }],
  },

  // building
  building: {
    borderWidth: 2,
    borderColor: "rgba(145,35,56,0.45)",
    backgroundColor: "rgba(255,255,255,0.60)",
    padding: 3,
    justifyContent: "space-between",
  },
  buildingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  win: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(145,35,56,0.45)",
  },
  buildingDoor: {
    alignSelf: "center",
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: "rgba(145,35,56,0.45)",
    marginTop: 2,
  },

  // chip icon boxes
  chipIconBox: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },

  // home
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: -2,
  },
  homeBody: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },

  // library (book)
  book: {
    width: 14,
    height: 16,
    borderWidth: 2,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  bookLine: {
    position: "absolute",
    width: 10,
    height: 2,
    left: 4,
    top: 7,
    borderRadius: 2,
    opacity: 0.8,
  },
});
