import React from "react";
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View } from "react-native";
import { useTheme } from '../../context/ThemeContext';

export default function Index() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          longitude: -73.57794498220551,
          latitude: 45.496054587119566,
          longitudeDelta: 0.01,
          latitudeDelta: 0.01
        }}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        <Marker
          coordinate={{ latitude: 45.4948, longitude: -73.5779 }}
          title={"SGW Campus"}
        />
        <Marker
          coordinate={{ latitude: 45.4581, longitude: -73.6391 }}
          title={"Loyola Campus"}
        />
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
