import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { styles, MAROON } from "../styles/searchBar.styles";

type Props = {
  readonly onOpen: () => void;
};

export default function CollapsedSearchBar({ onOpen }: Props) {
  return (
    <View style={styles.wrapperCollapsed} pointerEvents="box-none">
      <TouchableOpacity
        testID="searchbar.open"
        activeOpacity={0.9}
        style={styles.collapsedBar}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Search buildings, rooms"
      >
        <View style={styles.leftIconMini}>
          <FontAwesome
            name="search"
            size={16}
            color={MAROON}
            aria-hidden
          />
        </View>
        <Text style={styles.collapsedPlaceholder}>Search buildings, rooms...</Text>
      </TouchableOpacity>
    </View>
  );
}
