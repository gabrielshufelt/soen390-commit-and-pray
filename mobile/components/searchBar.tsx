import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform } from "react-native";

export type BuildingChoice = {
  id: string;
  name: string;
  code?: string;
  coordinate: { latitude: number; longitude: number };
};

type Props = {
  buildings: BuildingChoice[];
  start: BuildingChoice | null;
  destination: BuildingChoice | null;
  onChangeStart: (b: BuildingChoice | null) => void;
  onChangeDestination: (b: BuildingChoice | null) => void;
  routeActive: boolean;
  onGetDirections: () => void;
  onExitRoute: () => void;
};

const MAROON = "#912338";
const BORDER = "#912338";

function stripCodePrefix(name: string, code?: string) {
  if (!code) return name?.trim() ?? "";
  const n = (name ?? "").trim();
  const pattern = new RegExp(`^${code}\\s*[-—:]\\s*`, "i");
  return n.replace(pattern, "").trim();
}

function formatLabel(b: { name: string; code?: string }) {
  const cleanName = stripCodePrefix(b.name, b.code);
  return b.code ? `${b.code} - ${cleanName}` : cleanName;
}

export default function SearchBar({
  buildings,
  start,
  destination,
  onChangeStart,
  onChangeDestination,
  routeActive,
  onGetDirections,
  onExitRoute,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<"start" | "destination">("destination");
  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");

  useEffect(() => {
    if (start) setStartText(formatLabel(start));
  }, [start]);

  useEffect(() => {
    if (destination) setDestText(formatLabel(destination));
  }, [destination]);

  const query = (active === "start" ? startText : destText).trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!expanded || !query || routeActive) return [];
    return buildings
      .filter((b) => `${stripCodePrefix(b.name, b.code)} ${b.code ?? ""}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [expanded, query, buildings, routeActive]);

  function pick(b: BuildingChoice) {
    const label = formatLabel(b);
    if (active === "start") {
      onChangeStart(b);
      setStartText(label);
    } else {
      onChangeDestination(b);
      setDestText(label);
    }
  }

  const canDirections = !!destination;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pill, expanded && styles.pillActive]}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.85}
        >
          <Text style={styles.pillText}>{routeActive ? "Route active" : expanded ? "Directions" : "Search / Directions"}</Text>
          <Text style={styles.pillChevron}>{expanded ? "▾" : "▴"}</Text>
        </TouchableOpacity>

        {routeActive && (
          <TouchableOpacity style={styles.exitChip} onPress={onExitRoute} activeOpacity={0.85}>
            <Text style={styles.exitChipText}>Exit</Text>
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={styles.card}>
          <Text style={styles.label}>From</Text>
          <TextInput
            style={[styles.input, active === "start" && styles.inputActive]}
            value={startText}
            editable={!routeActive}
            onFocus={() => setActive("start")}
            onChangeText={(t) => {
              setStartText(t);
              onChangeStart(null);
            }}
            placeholder="Start building "
            placeholderTextColor="rgba(0,0,0,0.35)"
          />

          <Text style={styles.label}>To</Text>
          <TextInput
            style={[styles.input, active === "destination" && styles.inputActive]}
            value={destText}
            editable={!routeActive}
            onFocus={() => setActive("destination")}
            onChangeText={(t) => {
              setDestText(t);
              onChangeDestination(null);
            }}
            placeholder="Destination building"
            placeholderTextColor="rgba(0,0,0,0.35)"
          />

          {!routeActive ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !canDirections && styles.disabled]}
              disabled={!canDirections}
              onPress={onGetDirections}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>Get directions</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.routeHint}>Route is active. Press “Exit” to change inputs.</Text>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => pick(item)} activeOpacity={0.85}>
                    <Text style={styles.suggestionText}>{formatLabel(item)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 70,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },

  pillRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flex: 1,
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillActive: { borderColor: MAROON },
  pillText: { fontSize: 14, fontWeight: "700" },
  pillChevron: { fontSize: 16, opacity: 0.6 },

  exitChip: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  exitChipText: { fontWeight: "800", color: MAROON },

  card: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  label: { fontSize: 12, opacity: 0.6, marginTop: 6, marginBottom: 4 },

  input: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputActive: { borderColor: MAROON },

  primaryBtn: {
    marginTop: 10,
    backgroundColor: MAROON,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.45 },

  routeHint: { marginTop: 10, opacity: 0.6, fontSize: 12 },

  suggestions: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    maxHeight: 220,
  },
  suggestionItem: { paddingVertical: 10 },
  suggestionText: { fontSize: 14, fontWeight: "600" },
});
