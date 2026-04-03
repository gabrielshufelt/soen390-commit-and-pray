import React from "react";
import { Modal, View, Text, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles } from "@/styles/indoorMapModal.styles";

type Props = {
  readonly visible: boolean;
  readonly wheelchairAccessible: boolean;
  readonly avoidStairs: boolean;
  readonly preferElevators: boolean;
  readonly onChangeWheelchairAccessible: (value: boolean) => void;
  readonly onChangeAvoidStairs: (value: boolean) => void;
  readonly onChangePreferElevators: (value: boolean) => void;
  readonly onClose: () => void;
};

type ToggleItemProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID: string;
};

function ToggleItem({ title, description, value, onValueChange, testID }: ToggleItemProps) {
  return (
    <View style={styles.optionsToggleRow}>
      <View style={styles.optionsToggleTextContainer}>
        <Text style={styles.optionsToggleTitle}>{title}</Text>
        <Text style={styles.optionsToggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#C7CCD4", true: "#D7A0AA" }}
        thumbColor={value ? "#922338" : "#FFFFFF"}
        testID={testID}
      />
    </View>
  );
}

export default function IndoorRouteOptionsModal({
  visible,
  wheelchairAccessible,
  avoidStairs,
  preferElevators,
  onChangeWheelchairAccessible,
  onChangeAvoidStairs,
  onChangePreferElevators,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.optionsOverlay}>
        <View style={styles.optionsCard}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Accessibility & Route Options</Text>
            <TouchableOpacity style={styles.optionsCloseButton} onPress={onClose}>
              <Text style={styles.optionsCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ToggleItem
            title="Wheelchair accessible"
            description="Prioritise ramps and wide paths"
            value={wheelchairAccessible}
            onValueChange={onChangeWheelchairAccessible}
            testID="indoor.options.wheelchair"
          />

          <ToggleItem
            title="Avoid Stairs"
            description="Routes with no staircases"
            value={avoidStairs}
            onValueChange={onChangeAvoidStairs}
            testID="indoor.options.avoid-stairs"
          />

          <ToggleItem
            title="Prefer elevators"
            description="Indoor navigation using elevators"
            value={preferElevators}
            onValueChange={onChangePreferElevators}
            testID="indoor.options.prefer-elevators"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
