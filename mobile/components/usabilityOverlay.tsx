import React, { useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import { UsabilityDevMenu } from './usabilityDevMenu';
import { logRageClick } from '../utils/analytics';
import { usePathname } from 'expo-router';

export const UsabilityOverlay = ({ children }: { children: React.ReactNode }) => {
  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const pathname = usePathname();
  
  // Track continuous touches and their timestamps for Dev Menu and Rage Clicks
  const touchesRef = useRef<number[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        // We only listen in capture phase to record taps, but we don't block them
        const now = Date.now();
        const touches = touchesRef.current;
        touches.push(now);

        // Keep only touches within the last 1500ms
        const recentTouches = touches.filter(t => now - t <= 1500);
        touchesRef.current = recentTouches;

        // Trigger Dev menu on 5 rapid taps globally
        if (recentTouches.length >= 5) {
          setDevMenuVisible(true);
          touchesRef.current = []; // reset
        } 
        // Trigger rage click on 3 rapid taps (if not triggering dev menu)
        else if (recentTouches.length === 3) {
          logRageClick(pathname || 'unknown');
        }

        return false; // Very important to not block child touches
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