import { StyleSheet } from "react-native";

export const MAROON = "#912338";
export const WHITE = "#FFFFFF";
export const BLACK = "#000000";
export const MUTED = "#6B7280";
export const MUTED_LIGHT = "#9CA3AF";
export const TEXT_DARK = "#374151";
export const DISABLED = "#D1D5DB";
export const SURFACE = "#F3F4F6";
export const SURFACE_LIGHT = "#F9FAFB";
export const ICON_BG = "rgba(255, 255, 255, 0.2)";
export const TEXT_LIGHT = "rgba(255, 255, 255, 0.9)";

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    gap: 8,
  },
  currentStepCard: {
    flexDirection: "row",
    backgroundColor: MAROON,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ICON_BG,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  instructionContainer: {
    flex: 1,
  },
  distance: {
    fontSize: 28,
    fontWeight: "700",
    color: WHITE,
    marginBottom: 4,
  },
  instruction: {
    fontSize: 16,
    color: TEXT_LIGHT,
    lineHeight: 22,
  },
  nextStepCard: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 12,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: MUTED_LIGHT,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  nextContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextInstruction: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
  },
  nextDistance: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
  },
  controlsCard: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 12,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    color: MUTED,
  },
  etaText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  stepButtonDisabled: {
    backgroundColor: SURFACE_LIGHT,
  },
  endButton: {
    flex: 1,
    maxWidth: 120,
    height: 44,
    borderRadius: 22,
    backgroundColor: MAROON,
    justifyContent: "center",
    alignItems: "center",
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: WHITE,
  },
});
