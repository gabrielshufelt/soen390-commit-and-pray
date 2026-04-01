/* istanbul ignore file */
import { StyleSheet } from "react-native";

export const CONCORDIA_RED = '#922338';
export const WHITE = '#FFFFFF';
export const BLACK = '#000000';
export const MUTED = "#6B7280";
export const MUTED_LIGHT = "#9CA3AF";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: MUTED_LIGHT,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: BLACK,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  menuButtonText: {
    color: BLACK,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "700",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: CONCORDIA_RED,
    borderRadius: 8,
  },
  closeButtonText: {
    color: WHITE,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BLACK,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 8,
    textAlign: "center",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: MUTED_LIGHT,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: CONCORDIA_RED,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
  },
  tabTextActive: {
    color: CONCORDIA_RED,
  },

  // Search & Filters
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: WHITE,
    fontSize: 14,
    color: BLACK,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WHITE,
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: WHITE,
    borderColor: CONCORDIA_RED,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED,
  },
  filterLabelActive: {
    color: CONCORDIA_RED,
  },

  // Floor Tabs
  floorTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WHITE,
    gap: 8,
  },
  floorTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
  },
  floorTabActive: {
    backgroundColor: WHITE,
    borderColor: CONCORDIA_RED,
  },
  floorTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  floorTabTextActive: {
    color: CONCORDIA_RED,
  },

  // Room Grid
  roomGrid: {
    flex: 1,
  },
  roomGridContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  roomGridRow: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 0,
  },
  roomCard: {
    flex: 0.48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
  },
  roomCardSelected: {
    backgroundColor: WHITE,
    borderColor: CONCORDIA_RED,
    borderWidth: 2,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  roomCardCode: {
    fontSize: 16,
    fontWeight: "700",
    color: BLACK,
    marginBottom: 4,
  },
  roomCardCodeSelected: {
    color: CONCORDIA_RED,
  },
  roomCardMeta: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },

  // Selected Room Display on Map
  selectedRoomCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: MUTED_LIGHT,
    gap: 8,
  },
  selectedRoomLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: BLACK,
  },
  directionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  directionButtonFrom: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
    borderColor: CONCORDIA_RED,
  },
  directionButtonTo: {
    borderWidth: 0,
    backgroundColor: CONCORDIA_RED,
  },
  directionButtonFromText: {
    fontSize: 15,
    fontWeight: "600",
    color: CONCORDIA_RED,
  },
  directionButtonToText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },

  // Floor Controls
  floorControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
  },
  floorArrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CONCORDIA_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  floorArrowText: {
    fontSize: 16,
    color: WHITE,
    fontWeight: "800",
  },
  floorInfoPill: {
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  floorInfoText: {
    color: CONCORDIA_RED,
    fontWeight: "700",
  },
  mapViewContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: MUTED_LIGHT,
  },
  mapScrollContainer: {
    flex: 1,
    backgroundColor: MUTED_LIGHT,
    overflow: "hidden",
  },
  mapCard: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: MUTED_LIGHT,
    marginBottom: 0,
    borderWidth: 0,
  },
  zoomControlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: MUTED_LIGHT,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CONCORDIA_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: CONCORDIA_RED,
    color: WHITE,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: 10,
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: WHITE,
  },
  zoomLevelText: {
    fontSize: 14,
    fontWeight: "600",
    color: BLACK,
    minWidth: 40,
    textAlign: "center",
  },
  floorImage: {
    width: "100%",
    height: "100%",
  },
  roomOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  routeEndpoint: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: WHITE,
    transform: [{ translateX: -7 }, { translateY: -7 }],
  },
  routeStartEndpoint: {
    backgroundColor: "#0C8A3F",
  },
  routeEndEndpoint: {
    backgroundColor: "#1E64D8",
  },
  routeInfoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F0F6FF",
    borderWidth: 1,
    borderColor: "#BCD3F5",
    gap: 6,
  },
  routeInfoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#113C82",
  },
  crossFloorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#235CB8",
  },
  routeErrorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A12333",
  },
  clearRouteButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#1E64D8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearRouteButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E64D8",
  },
  roomDotContainer: {
    position: "absolute",
    transform: [{ translateX: -8 }, { translateY: -8 }],
    alignItems: "center",
  },
  roomDotContainerSelected: {
    transform: [{ translateX: -12 }, { translateY: -12 }, { scale: 1.4 }],
  },
  roomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DE2F2F",
    marginBottom: 2,
  },
  facilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#122B77",
  },
  roomDotSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: CONCORDIA_RED,
    borderWidth: 2,
    borderColor: WHITE,
  },
  roomLabel: {
    fontSize: 11,
    color: "#102447",
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  roomLabelSelected: {
    backgroundColor: CONCORDIA_RED,
    color: WHITE,
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: "700",
  },

  // Route Options Modal
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  optionsCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MUTED_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  optionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: MUTED_LIGHT,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BLACK,
  },
  optionsCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: CONCORDIA_RED,
    borderRadius: 8,
  },
  optionsCloseButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "700",
  },
  optionsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionsToggleTextContainer: {
    flex: 1,
  },
  optionsToggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BLACK,
  },
  optionsToggleDescription: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
    fontWeight: "500",
  },
});
