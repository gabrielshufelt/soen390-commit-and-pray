import { StyleSheet } from "react-native";

export const HIGHLIGHT_COLOR = "rgba(33, 150, 243, 0.4)";
export const STROKE_COLOR = "#2196F3";

export const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  map: { width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  overlayTitle: {
    color: "#9ca3af",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  overlayBuilding: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  overlayValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },

  labelContainer: { backgroundColor: "transparent" },
  buildingLabel: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    textShadowColor: "rgba(0, 0, 0, 0.75",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
