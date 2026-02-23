import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import shuttleData from '../data/shuttleSchedule.json';
import { styles, BLACK, WHITE, RED, GRAY, BLUE } from '../styles/shuttleScheduleModal.styles';

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


