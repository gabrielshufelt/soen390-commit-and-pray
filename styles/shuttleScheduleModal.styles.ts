import { StyleSheet } from 'react-native';

export const BLACK = 'rgba(0, 0, 0)';
export const WHITE = 'rgba(255, 255, 255)';
export const RED = '#8B0000';
export const GRAY = '#a0a0a0';
export const BLUE = '#0A84FF';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  activeTab: {
    // Active styling handled via borderBottomColor
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerContainer: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  scheduleContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    marginHorizontal: 12,
  },
  timeText: {
    fontSize: 15,
    marginVertical: 6,
    fontFamily: 'monospace',
  },
  noteContainer: {
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noteText: {
    fontSize: 13,
    marginVertical: 2,
    fontStyle: 'italic',
  },
  busStopsContainer: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  busStopsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  busStopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  busStopItem: {
    flex: 1,
    paddingHorizontal: 8,
  },
  busStopLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  busStopName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  busStopAddress: {
    fontSize: 11,
    lineHeight: 16,
  },
  routeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  routeButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});
