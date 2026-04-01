import { Tabs } from 'expo-router';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

function HomeTabIcon({ color, size }: { readonly color: string; readonly size: number }) {
  return <FontAwesome name="home" size={size} color={color} />;
}

function SettingsTabIcon({ color, size }: { readonly color: string; readonly size: number }) {
  return <FontAwesome name="cog" size={size} color={color} />;
}

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
          title: 'Map',
          tabBarIcon: MapTabIcon,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: NearbyTabIcon,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: SettingsTabIcon,
        }}
      />
    </Tabs>
  );
}
