import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FB",
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6F0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#16213A",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#8B0000",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#FFFFFF",
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
    color: "#1E2A47",
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#58627A",
    marginTop: 8,
    textAlign: "center",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6F0",
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
    borderBottomColor: "#8B0000",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A94A6",
  },
  tabTextActive: {
    color: "#8B0000",
  },

  // Search & Filters
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F0F3F8",
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E6F0",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F3F8",
    borderWidth: 1,
    borderColor: "#D0D8E8",
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: "#FFE6E6",
    borderColor: "#8B0000",
  },
  filterIcon: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A6B85",
  },
  filterLabelActive: {
    color: "#8B0000",
  },

  // Floor Tabs
  floorTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  floorTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0F3F8",
    borderWidth: 1,
    borderColor: "#D0D8E8",
  },
  floorTabActive: {
    backgroundColor: "#E7EEFF",
    borderColor: "#183E9F",
  },
  floorTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5A6B85",
  },
  floorTabTextActive: {
    color: "#183E9F",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E8F2",
  },
  roomCardSelected: {
    backgroundColor: "#FFE6E6",
    borderColor: "#8B0000",
    borderWidth: 2,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  roomCardCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18284B",
    marginBottom: 4,
  },
  roomCardCodeSelected: {
    color: "#8B0000",
  },
  roomCardMeta: {
    fontSize: 11,
    color: "#5D6D90",
    fontWeight: "600",
  },

  // Selected Room Display on Map
  selectedRoomCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E6F0",
    gap: 8,
  },
  selectedRoomLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18284B",
  },
  directionsButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#8B0000",
    alignItems: "center",
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
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
    backgroundColor: "#FFFFFF",
  },
  floorArrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#122B77",
    justifyContent: "center",
    alignItems: "center",
  },
  floorArrowText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  floorInfoPill: {
    backgroundColor: "#E7EEFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  floorInfoText: {
    color: "#183E9F",
    fontWeight: "700",
  },
  mapCard: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#D9E3FB",
    marginBottom: 0,
    borderWidth: 0,
  },
  floorImage: {
    width: "100%",
    height: "100%",
  },
  roomOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: "#8B0000",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
    backgroundColor: "#8B0000",
    color: "#FFFFFF",
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: "700",
  },
});
