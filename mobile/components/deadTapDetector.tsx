import React from 'react';
import { TouchableWithoutFeedback, View, StyleSheet } from 'react-native';
import { logDeadTap } from '../utils/analytics';
import { usePathname } from 'expo-router';

// Wrap text/headers or non-interactive UI in this to track when users mistakenly tap it
export const DeadTapDetector = ({ children, elementDescription }: { children: React.ReactNode, elementDescription: string }) => {
  const pathname = usePathname();

  const handleDeadTap = () => {
    logDeadTap(pathname || 'unknown', elementDescription);
  };

  return (
    <TouchableWithoutFeedback onPress={handleDeadTap}>
      <View style={styles.passthrough}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  passthrough: {
    // doesn't affect layout
  }
});
