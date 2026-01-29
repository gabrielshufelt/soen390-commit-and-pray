import React from "react";
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View } from "react-native";
import { useTheme } from '../../context/ThemeContext';
import { CAMPUSES, DEFAULT_CAMPUS } from '../../constants/campusLocations';

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const defaultCampus = CAMPUSES[DEFAULT_CAMPUS];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={defaultCampus.initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {Object.entries(CAMPUSES).map(([key, campus]) => (
          <Marker
            key={key}
            coordinate={campus.coordinate}
            title={campus.name}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: '100%',
    height: '100%',
  }
});
