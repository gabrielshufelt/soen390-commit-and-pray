import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { styles, WHITE, MUTED, DISABLED, MAROON } from "../styles/navigationSteps.styles";

export type NavigationStep = {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
};

type Props = {
  steps: NavigationStep[];
  currentStepIndex: number;
  totalDistance: string;
  totalDuration: string;
  onEndNavigation: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
};

const MANEUVER_ICONS: Record<string, string> = {
  "turn-left": "arrow-left",
  "turn-right": "arrow-right",
  "turn-slight-left": "arrow-left",
  "turn-slight-right": "arrow-right",
  "turn-sharp-left": "arrow-left",
  "turn-sharp-right": "arrow-right",
  "uturn-left": "undo",
  "uturn-right": "repeat",
  "straight": "arrow-up",
  "ramp-left": "arrow-left",
  "ramp-right": "arrow-right",
  "merge": "compress",
  "fork-left": "arrow-left",
  "fork-right": "arrow-right",
  "roundabout-left": "rotate-left",
  "roundabout-right": "rotate-right",
};

function getManeuverIcon(maneuver?: string): string {
  if (!maneuver) return "arrow-up";
  return MANEUVER_ICONS[maneuver] || "arrow-up";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NavigationSteps({
  steps,
  currentStepIndex,
  totalDistance,
  totalDuration,
  onEndNavigation,
  onNextStep,
  onPrevStep,
}: Props) {
  const [fadeAnim] = useState(new Animated.Value(1));

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStepIndex, fadeAnim]);

  if (!currentStep) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <View style={styles.container}>
      {/* Current Step Card */}
      <Animated.View style={[styles.currentStepCard, { opacity: fadeAnim }]}>
        <View style={styles.iconContainer}>
          <FontAwesome name={getManeuverIcon(currentStep.maneuver) as any} size={32} color={WHITE}/>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.distance}>{currentStep.distance}</Text>
          <Text style={styles.instruction} numberOfLines={2}>
            {stripHtml(currentStep.instruction)}
          </Text>
        </View>
      </Animated.View>

      {/* Next Step Preview */}
      {nextStep && (
        <View style={styles.nextStepCard}>
          <Text style={styles.nextLabel}>NEXT</Text>
          <View style={styles.nextContent}>
            <FontAwesome name={getManeuverIcon(nextStep.maneuver) as any} size={16} color={MUTED}
            />
            <Text style={styles.nextInstruction} numberOfLines={1}>
              {stripHtml(nextStep.instruction)}
            </Text>
            <Text style={styles.nextDistance}>{nextStep.distance}</Text>
          </View>
        </View>
      )}

      {/* Progress & Controls */}
      <View style={styles.controlsCard}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
          <Text style={styles.etaText}>
            {totalDistance} · {totalDuration}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          {/* Manual step controls */}
          <TouchableOpacity
            style={[styles.stepButton, isFirstStep && styles.stepButtonDisabled]}
            onPress={onPrevStep}
            disabled={isFirstStep}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
          >
            <FontAwesome name="chevron-left" size={16} color={isFirstStep ? DISABLED : MAROON}/>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endButton}
            onPress={onEndNavigation}
            accessibilityRole="button"
            accessibilityLabel="End navigation"
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stepButton, isLastStep && styles.stepButtonDisabled]}
            onPress={onNextStep}
            disabled={isLastStep}
            accessibilityRole="button"
            accessibilityLabel="Next step"
          >
            <FontAwesome name="chevron-right" size={16} color={isLastStep ? DISABLED : MAROON}/>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
