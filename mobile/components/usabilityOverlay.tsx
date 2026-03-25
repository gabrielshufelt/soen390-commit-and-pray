import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder } from 'react-native';
import { UsabilityDevMenu } from './usabilityDevMenu';
import { logRageClick } from '../utils/analytics';
import { registerDevMenuTrigger } from '../utils/devMenuController';
import { usePathname } from 'expo-router';

export const UsabilityOverlay = ({ children }: { children: React.ReactNode }) => {
  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const pathname = usePathname();
  const touchesRef = useRef<number[]>([]);

  // Register the module-level trigger so Settings screen can open this menu via long-press
  useEffect(() => {
    registerDevMenuTrigger(() => setDevMenuVisible(true));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        const now = Date.now();
        const recentTouches = [...touchesRef.current, now].filter(t => now - t <= 1500);
        touchesRef.current = recentTouches;

        // Exactly 3 rapid taps = participant frustration rage click
        if (recentTouches.length === 3) {
          logRageClick(pathname || 'unknown');
        }

        return false; // Never block child touch events
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
      <UsabilityDevMenu visible={devMenuVisible} onClose={() => setDevMenuVisible(false)} />
    </View>
  );
};