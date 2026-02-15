import { StyleSheet, Platform } from "react-native";

export const MAROON = "#912338";
export const TEXT = "#111827";
export const MUTED = "#6B7280";
export const BORDER = "rgba(17, 24, 39, 0.10)";
export const SURFACE = "rgba(255,255,255,0.96)";
export const SHEET_BG = "#F7F3F1";
export const CARD_BG = "#FFFFFF";

export const styles = StyleSheet.create({
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    position: "relative",
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerRightBtn: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
  startRouteButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: MAROON,
    borderWidth: 1,
    borderColor: MAROON,
  },
  startRouteButtonText: {
    fontWeight: "900",
    color: "#FFFFFF",
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
  filterChipActive: {
    borderColor: "rgba(145,35,56,0.35)",
    backgroundColor: "rgba(145,35,56,0.08)",
  },
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

export const iconStyles = StyleSheet.create({
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
