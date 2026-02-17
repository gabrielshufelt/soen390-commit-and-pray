import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";

export default function CampusToggle({ selectedCampus, onCampusChange }) {
  return (
    <View style={styles.toggleContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.button, selectedCampus === "SGW" && styles.activeButton]}
        onPress={() => onCampusChange("SGW")}
        activeOpacity={0.75}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Select SGW campus"
        accessibilityState={{ selected: selectedCampus === "SGW" }}
        accessibilityValue={{ text: "SGW" }}
        android_ripple={
          Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined
        }
      >
        <Text style={selectedCampus === "SGW" ? styles.activeText : styles.text}>
          SGW
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          selectedCampus === "LOYOLA" && styles.activeButton,
        ]}
        onPress={() => onCampusChange("LOYOLA")}
        activeOpacity={0.75}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Select Loyola campus"
        accessibilityState={{ selected: selectedCampus === "LOYOLA" }}
        accessibilityValue={{ text: "Loyola" }}
        android_ripple={
          Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined
        }
      >
        <Text style={selectedCampus === "LOYOLA" ? styles.activeText : styles.text}>
          Loyola
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 4,
    zIndex: 10,

    // floating effect
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  button: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    overflow: "hidden",
  },

  activeButton: {
    backgroundColor: "#912338",
  },

  activeText: {
    color: "#fff",
    fontWeight: "600",
  },

  text: {
    color: "#222",
  },
});