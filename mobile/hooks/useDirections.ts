import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getInteriorPoint } from '../utils/geometry';

import type { NavigationStep } from '../components/NavigationSteps';
import type { MapViewDirectionsMode } from 'react-native-maps-directions';

export type Coordinates = { latitude: number; longitude: number };

export interface DirectionsState {
  origin: Coordinates | null;
  destination: Coordinates | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
  transportMode: MapViewDirectionsMode;
  routeInfo: {
    distance: number | null;
    duration: number | null;
    distanceText: string | null;
    durationText: string | null;
  };
  steps: NavigationStep[];
  currentStepIndex: number;
  routeCoordinates: Coordinates[];
  isOffRoute: boolean;
}

// Adapted from https://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
function getDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getDistanceToRoute(point: Coordinates, route: Coordinates[]): number {
  if (route.length === 0) return Infinity;
  let minDist = Infinity;
  for (const coord of route) {
    minDist = Math.min(minDist, getDistanceMeters(point, coord));
  }
  return minDist;
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
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
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
  coordinates?: Coordinates[];
}

interface DirectionsResult {
  state: DirectionsState;
  apiKey: string;
  startDirections: (origin: Coordinates, destination: Coordinates) => void;
  previewDirections: (origin: Coordinates, destination: Coordinates) => void;
  startDirectionsToBuilding: (
    origin: Location.LocationObject,
    buildingPolygon: number[][]
  ) => void;
  endDirections: () => void;
  onRouteReady: (result: MapDirectionsResult) => void;
  nextStep: () => void;
  prevStep: () => void;
  checkProgress: (userLocation: Coordinates) => void;
  setTransportMode: (mode: MapViewDirectionsMode) => void;
  previewRouteInfo: {
    distance: number | null;
    duration: number | null;
    distanceText: string | null;
    durationText: string | null;
  };
  setPreviewRouteInfo: (info: { distance: number | null; duration: number | null; distanceText: string | null; durationText: string | null }) => void;
}

const initialState: DirectionsState = {
  origin: null,
  destination: null,
  isActive: false,
  loading: false,
  error: null,
  transportMode: 'DRIVING',
  routeInfo: {
    distance: null,
    duration: null,
    distanceText: null,
    durationText: null,
  },
  steps: [],
  currentStepIndex: 0,
  routeCoordinates: [],
  isOffRoute: false,
};

const STEP_THRESHOLD_METERS = 25;
const OFF_ROUTE_THRESHOLD_METERS = 50;

export function useDirections(): DirectionsResult {
  const [state, setState] = useState<DirectionsState>(initialState);
  const [previewRouteInfo, setPreviewRouteInfo] = useState<{
    distance: number | null;
    duration: number | null;
    distanceText: string | null;
    durationText: string | null;
  }>({
    distance: null,
    duration: null,
    distanceText: null,
    durationText: null,
  });

  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  const startDirections = useCallback(
    (origin: Coordinates, destination: Coordinates) => {
      setState((prev) => ({
        ...initialState,
        origin,
        destination,
        isActive: true,
        transportMode: prev.transportMode,
      }));
    },
    []
  );

  const previewDirections = useCallback(
    (origin: Coordinates, destination: Coordinates) => {
      setState((prev) => ({
        ...initialState,
        origin,
        destination,
        isActive: false,
        transportMode: prev.transportMode,
      }));
    },
    []
  );

  const startDirectionsToBuilding = useCallback(
    (origin: Location.LocationObject, buildingPolygon: number[][]) => {
      const originCoords = locationToCoordinates(origin);
      const destinationCoords = getInteriorPoint(buildingPolygon);

      setState((prev) => ({
        ...initialState,
        origin: originCoords,
        destination: destinationCoords,
        isActive: true,
        transportMode: prev.transportMode,
      }));
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
        startLocation: { latitude: step.start_location.lat, longitude: step.start_location.lng },
        endLocation: { latitude: step.end_location.lat, longitude: step.end_location.lng },
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
        routeCoordinates: result.coordinates ?? [],
        isOffRoute: false,
      }));
    },
    []
  );

  const setTransportMode = useCallback((mode: MapViewDirectionsMode) => {
    setState((prev) => ({ ...prev, transportMode: mode }));
  }, []);

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

  const checkProgress = useCallback((userLocation: Coordinates) => {
    setState((prev) => {
      if (!prev.isActive || prev.steps.length === 0) return prev;

      const currentStep = prev.steps[prev.currentStepIndex];
      if (!currentStep) return prev;

      // Check if user reached current step's endpoint
      const distToEnd = getDistanceMeters(userLocation, currentStep.endLocation);
      const reachedStep = distToEnd < STEP_THRESHOLD_METERS;

      // Check if off route
      const distToRoute = getDistanceToRoute(userLocation, prev.routeCoordinates);
      const isOffRoute = distToRoute > OFF_ROUTE_THRESHOLD_METERS;

      // Advance step if reached and not at last step
      const newIndex = reachedStep && prev.currentStepIndex < prev.steps.length - 1
        ? prev.currentStepIndex + 1
        : prev.currentStepIndex;

      if (newIndex === prev.currentStepIndex && isOffRoute === prev.isOffRoute) {
        return prev;
      }

      return { ...prev, currentStepIndex: newIndex, isOffRoute };
    });
  }, []);

  return { state, apiKey, startDirections, previewDirections, startDirectionsToBuilding, endDirections, onRouteReady, nextStep, prevStep, checkProgress, setTransportMode, previewRouteInfo, setPreviewRouteInfo };
}