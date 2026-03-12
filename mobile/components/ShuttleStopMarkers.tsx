import React from "react";
import { View, Text } from "react-native";
import { Marker } from "react-native-maps";
import shuttleData from "../data/shuttleSchedule.json";
import { styles } from "../styles/index.styles";

const ANCHOR_OFFSET = { x: 0.5, y: 0.5 };

/** Renders the two static shuttle bus stop markers on the map. */
const ShuttleStopMarkers = React.memo(function ShuttleStopMarkers() {
  return (
    <>
      <Marker
        testID="shuttle-stop-marker"
        coordinate={shuttleData.busStops.loyola.coordinate}
        title="Loyola Shuttle Stop"
        description={shuttleData.busStops.loyola.address}
        anchor={ANCHOR_OFFSET}
        tracksViewChanges={false}
        zIndex={1000}
      >
        <View style={styles.busStopMarker}>
          <Text style={styles.busStopIcon}>🚏</Text>
        </View>
      </Marker>

      <Marker
        testID="shuttle-stop-marker"
        coordinate={shuttleData.busStops.sgw.coordinate}
        title="SGW Shuttle Stop"
        description={shuttleData.busStops.sgw.address}
        anchor={ANCHOR_OFFSET}
        tracksViewChanges={false}
        zIndex={1000}
      >
        <View style={styles.busStopMarker}>
          <Text style={styles.busStopIcon}>🚏</Text>
        </View>
      </Marker>
    </>
  );
});

export default ShuttleStopMarkers;
