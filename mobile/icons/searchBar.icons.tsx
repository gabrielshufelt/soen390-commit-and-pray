import React from "react";
import { View, Text } from "react-native";
import { iconStyles, MAROON, MUTED } from "../styles/searchBar.styles";

export function IconPin({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={[iconStyles.circle, { width: s, height: s, borderRadius: s / 2 }]}>
      <View
        style={[
          iconStyles.pinDot,
          { width: s * 0.34, height: s * 0.34, borderRadius: (s * 0.34) / 2 },
        ]}
      />
      <View style={[iconStyles.pinStem, { width: s * 0.12, height: s * 0.48 }]} />
    </View>
  );
}

export function IconSearch({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      <View
        style={[
          iconStyles.lens,
          { width: s * 0.62, height: s * 0.62, borderRadius: (s * 0.62) / 2 },
        ]}
      />
      <View style={[iconStyles.handle, { width: s * 0.42, height: s * 0.10, borderRadius: 99 }]} />
    </View>
  );
}

export function IconBuilding({ size = 18 }: { size?: number }) {
  const s = size;
  return (
    <View style={[iconStyles.building, { width: s, height: s, borderRadius: 6 }]}>
      <View style={iconStyles.buildingRow}>
        <View style={iconStyles.win} />
        <View style={iconStyles.win} />
      </View>
      <View style={iconStyles.buildingRow}>
        <View style={iconStyles.win} />
        <View style={iconStyles.win} />
      </View>
      <View style={iconStyles.buildingDoor} />
    </View>
  );
}

export function IconHome({ active }: { active: boolean }) {
  return (
    <View style={iconStyles.chipIconBox}>
      <View style={[iconStyles.homeRoof, { borderBottomColor: active ? MAROON : MUTED }]} />
      <View style={[iconStyles.homeBody, { borderColor: active ? MAROON : MUTED }]} />
    </View>
  );
}

export function IconLibrary({ active }: { active: boolean }) {
  return (
    <View style={iconStyles.chipIconBox}>
      <View style={[iconStyles.book, { borderColor: active ? MAROON : MUTED }]} />
      <View style={[iconStyles.bookLine, { backgroundColor: active ? MAROON : MUTED }]} />
    </View>
  );
}

export function IconStar({ active }: { active: boolean }) {
  return <Text style={{ fontSize: 14, color: active ? MAROON : MUTED, fontWeight: "900" }}>★</Text>;
}
