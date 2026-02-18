import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getInteriorPoint } from '../utils/geometry';
import type { NavigationStep } from '../components/NavigationSteps';

export type Coordinates = { latitude: number; longitude: number };

export interface DirectionsState {
  origin: Coordinates | null;
  destination: Coordinates | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
  routeInfo: {
    distance: number | null;
    duration: number | null;
    distanceText: string | null;
    durationText: string | null;
  };
  steps: NavigationStep[];
  currentStepIndex: number;
}

export function locationToCoordinates(
  location: Location.LocationObject
): Coordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

interface GoogleDirectionsStep {
  html_instructions: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  maneuver?: string;
}

interface GoogleDirectionsLeg {
  steps: GoogleDirectionsStep[];
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

interface MapDirectionsResult {
  distance: number;
  duration: number;
  legs?: GoogleDirectionsLeg[];
}

interface DirectionsResult {
  state: DirectionsState;
  apiKey: string;
  startDirections: (origin: Coordinates, destination: Coordinates) => void;
  startDirectionsToBuilding: (
    origin: Location.LocationObject,
    buildingPolygon: number[][]
  ) => void;
  endDirections: () => void;
  onRouteReady: (result: MapDirectionsResult) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const initialState: DirectionsState = {
  origin: null,
  destination: null,
  isActive: false,
  loading: false,
  error: null,
  routeInfo: {
    distance: null,
    duration: null,
    distanceText: null,
    durationText: null,
  },
  steps: [],
  currentStepIndex: 0,
};

export function useDirections(): DirectionsResult {
  const [state, setState] = useState<DirectionsState>(initialState);

  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  const startDirections = useCallback(
    (origin: Coordinates, destination: Coordinates) => {
      setState({
        origin,
        destination,
        isActive: true,
        loading: false,
        error: null,
        routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
        steps: [],
        currentStepIndex: 0,
      });
    },
    []
  );

  const startDirectionsToBuilding = useCallback(
    (origin: Location.LocationObject, buildingPolygon: number[][]) => {
      const originCoords = locationToCoordinates(origin);
      const destinationCoords = getInteriorPoint(buildingPolygon);

      setState({
        origin: originCoords,
        destination: destinationCoords,
        isActive: true,
        loading: false,
        error: null,
        routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
        steps: [],
        currentStepIndex: 0,
      });
    },
    []
  );

  const endDirections = useCallback(() => {
    setState(initialState);
  }, []);

  const onRouteReady = useCallback(
    (result: MapDirectionsResult) => {
      const leg = result.legs?.[0];
      const steps: NavigationStep[] = leg?.steps?.map((step) => ({
        instruction: step.html_instructions,
        distance: step.distance.text,
        duration: step.duration.text,
        maneuver: step.maneuver,
      })) ?? [];

      setState((prev) => ({
        ...prev,
        routeInfo: {
          distance: result.distance,
          duration: result.duration,
          distanceText: leg?.distance.text ?? null,
          durationText: leg?.duration.text ?? null,
        },
        steps,
        currentStepIndex: 0,
      }));
    },
    []
  );

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, prev.steps.length - 1),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, []);

  return { state, apiKey, startDirections, startDirectionsToBuilding, endDirections, onRouteReady, nextStep, prevStep };
}
