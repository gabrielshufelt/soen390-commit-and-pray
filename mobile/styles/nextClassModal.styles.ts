import { StyleSheet } from 'react-native';

export const CONCORDIA_RED = '#922338';
export const WHITE = '#FFFFFF';
export const BLACK = '#000000';
export const MUTED = '#6B7280';
export const MUTED_LIGHT = '#9CA3AF';
export const TEXT_DARK = '#F9FAFB';
export const TEXT_LIGHT = '#111827';
export const DIVIDER_LIGHT = '#E5E7EB';
export const DIVIDER_DARK = '#374151';
export const CARD_LIGHT = '#FFFFFF';
export const CARD_DARK = '#1F2937';
export const SUCCESS = '#16a34a';
export const ICON_GREY = '#6B7280';
export const ICON_GREY_DARK = '#9CA3AF';

export const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    // Shadow (iOS)
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
  },
  cardLight: {
    backgroundColor: CARD_LIGHT,
  },
  cardDark: {
    backgroundColor: CARD_DARK,
  },

  // Top section
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  // Left column
  leftCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 48,
  },
  buildingBadge: {
    backgroundColor: CONCORDIA_RED,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingBadgeText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  badgeIconSpacer: {
    marginTop: 8,
    alignItems: 'center',
  },

  // Right column
  rightCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '500',
  },
  className: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
  },

  // Divider
  divider: {
    height: 1,
    marginBottom: 10,
  },
  dividerLight: {
    backgroundColor: DIVIDER_LIGHT,
  },
  dividerDark: {
    backgroundColor: DIVIDER_DARK,
  },

  // Bottom section
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walkTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONCORDIA_RED,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  directionsButtonText: {
    color: WHITE,
    fontWeight: '600',
    fontSize: 14,
  },

  // Done / info cards
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Text colour variants
  textMain: {
    color: TEXT_LIGHT,
  },
  textDark: {
    color: TEXT_DARK,
  },
  textMuted: {
    color: MUTED,
  },
  textMutedDark: {
    color: ICON_GREY_DARK,
  },
});
