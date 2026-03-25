import { Tabs } from 'expo-router';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerDevMenu } from '../../utils/devMenuController';

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
        },
        tabBarActiveTintColor: isDark ? '#0a84ff' : '#007aff',
        tabBarInactiveTintColor: '#8e8e93',
        headerStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
        },
        headerTintColor: isDark ? '#ffffff' : '#000000',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
          tabBarButton: ({ onPress, onLongPress: _ignored, children, style, accessibilityState }) => (
            <Pressable
              onPress={onPress}
              onLongPress={triggerDevMenu}
              delayLongPress={500}
              style={style}
              accessibilityState={accessibilityState}
            >
              {children}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
