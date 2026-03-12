import React from "react";
import { View, Text } from "react-native";
import { Polygon, Marker } from "react-native-maps";
import { BUILDING_POLYGON_COLORS } from "../constants/mapColors";
import { HIGHLIGHT_COLOR, STROKE_COLOR, styles } from "../styles/index.styles";
import { getInteriorPoint } from "../utils/geometry";

const ANCHOR_OFFSET = { x: 0.5, y: 0.5 };

interface BuildingLayerProps {
  buildings: any[];
  selectedBuildingId: string | null;
  userBuildingId: string | null;
  showLabels: boolean;
  onBuildingSelect: (id: string, data: any) => void;
}

const BuildingLayer = React.memo(function BuildingLayer({
  buildings,
  selectedBuildingId,
  userBuildingId,
  showLabels,
  onBuildingSelect,
}: BuildingLayerProps) {
  return (
    <>
      {buildings.map((building: any) => {
        const isSelected = selectedBuildingId === building.id;
        const isUserInside = userBuildingId === building.id;
        const code: string | undefined = building.properties?.code;

        const coordinates = building.geometry.coordinates[0].map(
          ([longitude, latitude]: [number, number]) => ({ latitude, longitude })
        );
        const fillColor = isSelected || isUserInside ? HIGHLIGHT_COLOR : BUILDING_POLYGON_COLORS.fillColor;
        const strokeColor = isSelected || isUserInside ? STROKE_COLOR : BUILDING_POLYGON_COLORS.strokeColor;

        return (
          <React.Fragment key={building.id}>
            <Polygon
              testID={`building-${building.id}`}
              coordinates={coordinates}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={BUILDING_POLYGON_COLORS.strokeWidth}
              tappable
              onPress={() => onBuildingSelect(building.id, building)}
            />
            {showLabels && code && (
              <Marker
                key={`label-${building.id}`}
                coordinate={getInteriorPoint(building.geometry.coordinates[0])}
                anchor={ANCHOR_OFFSET}
                tracksViewChanges={false}
              >
                <View style={styles.labelContainer}>
                  <Text style={styles.buildingLabel}>{code}</Text>
                </View>
              </Marker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
});

export default BuildingLayer;
