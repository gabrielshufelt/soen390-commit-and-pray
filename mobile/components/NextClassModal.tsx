import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { ParsedNextClass, NextClassStatus, NO_CLASS_BEHAVIOR } from '../hooks/useNextClass';
import { DEV_OVERRIDE_TIME } from '../utils/devConfig';


interface NextClassModalProps {
  nextClass: ParsedNextClass | null;
  status: NextClassStatus;
  isLoading: boolean;
}

// Helpers
function getNow(): Date {
  return DEV_OVERRIDE_TIME ? new Date(DEV_OVERRIDE_TIME) : new Date();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getMinutesUntil(target: Date): number {
  const diffMs = target.getTime() - getNow().getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

// End of helpers

export default function NextClassModal({ nextClass, status, isLoading }: NextClassModalProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  // Live "in X mins" counter — updates every 30s
  const [minutesUntil, setMinutesUntil] = useState<number>(
    nextClass ? getMinutesUntil(nextClass.startTime) : 0,
  );

  useEffect(() => {
    if (!nextClass) return;
    setMinutesUntil(getMinutesUntil(nextClass.startTime));

    const id = setInterval(() => {
      setMinutesUntil(getMinutesUntil(nextClass.startTime));
    }, 30_000);

    return () => clearInterval(id);
  }, [nextClass]);

  // Loading state
  if (isLoading || status === 'loading') {
    return (
      <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
        <ActivityIndicator color="#922338" style={{ marginVertical: 12 }} />
      </View>
    );
  }

  // No calendar selected state
  if (status === 'no_calendar') {
    return null; // Silent. User simply hasn't picked a calendar yet
  }

  // School day finished state
  if (status === 'done_today') {
    return (
      <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
          <Text style={[styles.doneText, isDark ? styles.textDark : styles.textMain]}>
            School day finished. See you tomorrow!
          </Text>
        </View>
      </View>
    );
  }

  // No classes today state
  if (status === 'no_class') {
    if (NO_CLASS_BEHAVIOR === 'hide') return null;
    return (
      <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.doneRow}>
          <Ionicons name="calendar-outline" size={22} color="#6B7280" />
          <Text style={[styles.doneText, isDark ? styles.textDark : styles.textMain]}>
            No classes today
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (status === 'error' || !nextClass) {
    return null;
  }

  // Next class found
  const buildingLabel = nextClass.buildingCode || '?';
  const roomLabel = nextClass.room
    ? `${nextClass.buildingCode}-${nextClass.room}`
    : nextClass.buildingCode;

  return (
    <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>

      <View style={styles.topSection}>

        {/* Left column: building badge + navigate icon */}
        <View style={styles.leftCol}>
          <View style={styles.buildingBadge}>
            <Text style={styles.buildingBadgeText} numberOfLines={1} adjustsFontSizeToFit>
              {buildingLabel}
            </Text>
          </View>
          <View style={styles.badgeIconSpacer}>
            <Ionicons name="navigate-circle-outline" size={26} color="#922338" />
          </View>
        </View>

        {/* Right column: labels + class info */}
        <View style={styles.rightCol}>

          {/* "NEXT CLASS"  ·  "In X mins" */}
          <View style={styles.headerRow}>
            <Text style={[styles.labelText, isDark ? styles.textMutedDark : styles.textMuted]}>
              NEXT CLASS
            </Text>
            <Text style={[styles.countdownText, isDark ? styles.textMutedDark : styles.textMuted]}>
              {minutesUntil <= 0 ? 'Starting now' : `In ${minutesUntil} min`}
            </Text>
          </View>

          {/* Class name */}
          <Text
            style={[styles.className, isDark ? styles.textDark : styles.textMain]}
            numberOfLines={1}
          >
            {nextClass.title || 'Unknown Class'}
          </Text>

          {/* Room + time range */}
          <View style={styles.detailRow}>
            <Text style={[styles.roomText, isDark ? styles.textMutedDark : styles.textMuted]}>
              {roomLabel}
            </Text>
            <Ionicons
              name="time-outline"
              size={13}
              color={isDark ? '#9CA3AF' : '#6B7280'}
              style={{ marginLeft: 8, marginRight: 3 }}
            />
            <Text style={[styles.timeText, isDark ? styles.textMutedDark : styles.textMuted]}>
              {formatTime(nextClass.startTime)} – {formatTime(nextClass.endTime)}
            </Text>
          </View>

        </View>
      </View>

      <View style={[styles.divider, isDark ? styles.dividerDark : styles.dividerLight]} />

      {/* Bottom section: walk time + button*/}
      <View style={styles.bottomSection}>
        <View style={styles.walkTimeRow}>
          <Ionicons name="walk-outline" size={16} color={isDark ? '#D1D5DB' : '#374151'} />
          <Text style={[styles.walkText, isDark ? styles.textDark : styles.textMain]}>
            {nextClass.walkingMinutes != null
              ? ` ${nextClass.walkingMinutes} min walk`
              : ' Walk time unavailable'}
          </Text>
        </View>

        {/* Get Directions: placeholder, no functionality yet */}
        <TouchableOpacity
          style={styles.directionsButton}
          activeOpacity={0.8}
          onPress={() => {
            // TODO: implement indoor/outdoor navigation to next class
          }}
        >
          <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}



const CONCORDIA_RED = '#922338';

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
  },
  cardDark: {
    backgroundColor: '#1F2937',
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
    color: '#FFFFFF',
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
    backgroundColor: '#E5E7EB',
  },
  dividerDark: {
    backgroundColor: '#374151',
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
    color: '#FFFFFF',
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
    color: '#111827',
  },
  textDark: {
    color: '#F9FAFB',
  },
  textMuted: {
    color: '#6B7280',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});
