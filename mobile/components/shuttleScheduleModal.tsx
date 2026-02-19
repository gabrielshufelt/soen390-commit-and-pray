import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import shuttleData from '../data/shuttleSchedule.json';

const BLACK = 'rgba(0, 0, 0)';
const WHITE = 'rgba(255, 255, 255)';
const RED = '#8B0000';
const GRAY = '#a0a0a0';
const BLUE = '#0A84FF';

interface ShuttleScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onShowRoute?: () => void;
}

export default function ShuttleScheduleModal({ visible, onClose, onShowRoute }: ShuttleScheduleModalProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const screenHeight = Dimensions.get('window').height;

  const [selectedDay, setSelectedDay] = useState<'mondayToThursday' | 'friday'>('mondayToThursday');

  const schedule = shuttleData.schedules[selectedDay];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: isDark ? BLACK : WHITE, height: screenHeight * 0.7 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? WHITE : BLACK }]}>🚌 Shuttle Schedule</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={{ color: isDark ? WHITE : BLACK, fontSize: 20, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedDay === 'mondayToThursday' && styles.activeTab,
                { borderBottomColor: selectedDay === 'mondayToThursday' ? BLUE : 'transparent' }
              ]}
              onPress={() => setSelectedDay('mondayToThursday')}
            >
              <Text style={[
                styles.tabText,
                { color: selectedDay === 'mondayToThursday' ? BLUE : GRAY }
              ]}>
                Mon-Thu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedDay === 'friday' && styles.activeTab,
                { borderBottomColor: selectedDay === 'friday' ? BLUE : 'transparent' }
              ]}
              onPress={() => setSelectedDay('friday')}
            >
              <Text style={[
                styles.tabText,
                { color: selectedDay === 'friday' ? BLUE : GRAY }
              ]}>
                Friday
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimerContainer}>
            <Text style={[styles.disclaimer, { color: GRAY }]}>
              ⚠️ {shuttleData.disclaimer}
            </Text>
          </View>

          <View style={styles.busStopsContainer}>
            <Text style={[styles.busStopsTitle, { color: isDark ? WHITE : BLACK }]}>Bus Stops</Text>
            <View style={styles.busStopRow}>
              <View style={styles.busStopItem}>
                <Text style={[styles.busStopLabel, { color: RED }]}>Loyola</Text>
                <Text style={[styles.busStopName, { color: isDark ? WHITE : BLACK }]}>{shuttleData.busStops.loyola.name}</Text>
                <Text style={[styles.busStopAddress, { color: GRAY }]}>{shuttleData.busStops.loyola.address}</Text>
              </View>
              <View style={styles.busStopItem}>
                <Text style={[styles.busStopLabel, { color: RED }]}>SGW</Text>
                <Text style={[styles.busStopName, { color: isDark ? WHITE : BLACK }]}>{shuttleData.busStops.sgw.name}</Text>
                <Text style={[styles.busStopAddress, { color: GRAY }]}>{shuttleData.busStops.sgw.address}</Text>
              </View>
            </View>
            {onShowRoute && (
              <TouchableOpacity
                style={[styles.routeButton, { backgroundColor: BLUE }]}
                onPress={() => {
                  onShowRoute();
                  onClose();
                }}
              >
                <Text style={styles.routeButtonText}>🗺️ Show Shuttle Route on Map</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.scheduleContainer}>
              <View style={styles.column}>
                <Text style={[styles.columnHeader, { color: RED }]}>Loyola Departures</Text>
                {schedule.loyolaDepartures.map((time, index) => (
                  <Text key={`loy-${index}`} style={[styles.timeText, { color: isDark ? WHITE : BLACK }]}>
                    {time}
                  </Text>
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />

              <View style={styles.column}>
                <Text style={[styles.columnHeader, { color: RED }]}>SGW Departures</Text>
                {schedule.sgwDepartures.map((time, index) => (
                  <Text key={`sgw-${index}`} style={[styles.timeText, { color: isDark ? WHITE : BLACK }]}>
                    {time}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.noteContainer}>
              <Text style={[styles.noteText, { color: GRAY }]}>
                * Last bus - Loyola: {schedule.lastBusNote.loyola}
              </Text>
              <Text style={[styles.noteText, { color: GRAY }]}>
                * Last bus - SGW: {schedule.lastBusNote.sgw}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
