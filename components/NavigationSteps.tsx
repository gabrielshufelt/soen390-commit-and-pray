import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { styles, WHITE, MUTED, DISABLED, MAROON, WARNING } from "../styles/navigationSteps.styles";

type LatLng = { latitude: number; longitude: number };

type BaseStep = {
  instruction: string;
  distance: string;
  coordinates?: LatLng;
};

type OutdoorStep = BaseStep & {
  source: "outdoor";
  duration?: string;
  maneuver?: string;
  startLocation: LatLng;
  endLocation: LatLng;
};

type IndoorStep = BaseStep & {
  source: "indoor";
  buildingCode?: string;
  floor?: number;
  startNodeId?: string;
  endNodeId?: string;
  startNodeLabel?: string;
  endNodeLabel?: string;
};

export type NavigationStep = OutdoorStep | IndoorStep;

type Props = {
  steps: NavigationStep[];
  currentStepIndex: number;
  totalDistance: string;
  totalDuration: string;
  isOffRoute?: boolean;
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
    .replace(/<[^>]{0,10000}>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NavigationSteps({
  steps,
  currentStepIndex,
  totalDistance,
  totalDuration,
  isOffRoute = false,
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
  
  // Detect if this is the last outdoor step before indoor begins
  const isLastOutdoorStep =
    currentStep.source === "outdoor" && nextStep?.source === "indoor";

  return (
    <View style={styles.container}>
      {/* Off-route warning banner */}
      {isOffRoute && (
        <View style={styles.offRouteBanner}>
          <FontAwesome name="exclamation-triangle" size={16} color={WARNING} />
          <Text style={styles.offRouteText}>You are off route. Head back to the path.</Text>
        </View>
      )}

      {/* Current Step Card */}
      <Animated.View style={[styles.currentStepCard, { opacity: fadeAnim }]}>
        <View style={styles.iconContainer}>
          <FontAwesome
            name={getManeuverIcon(currentStep.source === "outdoor" ? currentStep.maneuver : undefined) as any}
            size={32}
            color={WHITE}
          />
        </View>

        <View style={styles.instructionContainer}>
          {!!currentStep.source && (
            <Text style={styles.nextLabel}>{currentStep.source.toUpperCase()}</Text>
          )}
          <Text style={styles.distance}>{currentStep.distance}</Text>
          {currentStep.source === "indoor" && !!currentStep.buildingCode && (
            <Text style={styles.nextInstruction} numberOfLines={1}>
              {currentStep.buildingCode}{typeof currentStep.floor === "number" ? ` · Floor ${currentStep.floor}` : ""}
            </Text>
          )}
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
            <FontAwesome
              name={getManeuverIcon(nextStep.source === "outdoor" ? nextStep.maneuver : undefined) as any}
              size={16}
              color={MUTED}
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
            accessibilityState={{ disabled: isFirstStep }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: isFirstStep ? DISABLED : MAROON }}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endButton}
            onPress={onEndNavigation}
            accessibilityRole="button"
            accessibilityLabel="End navigation"
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>

          {/* Conditional button: "Enter Building" at last outdoor step, else "Next ›" */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.stepButton, isLastStep && styles.stepButtonDisabled]}
              onPress={onNextStep}
              disabled={isLastStep}
              accessibilityRole="button"
              accessibilityLabel={isLastOutdoorStep ? "Enter building" : "Next step"}
              accessibilityState={{ disabled: isLastStep }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isLastStep ? DISABLED : MAROON }}>
                {isLastOutdoorStep ? "⬆" : "›"}
              </Text>
            </TouchableOpacity>
            {isLastOutdoorStep && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: MAROON }}>Indoor</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
