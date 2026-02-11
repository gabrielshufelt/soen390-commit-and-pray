import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getInteriorPoint } from '../utils/geometry';

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
  };
}

export function locationToCoordinates(
  location: Location.LocationObject
): Coordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

interface DirectionsResult {
  state: DirectionsState;
  apiKey: string;
  startDirections: (origin: Coordinates, destination: Coordinates) => void;
  startDirectionsToBuilding: (
    origin: Location.LocationObject,
    buildingPolygon: number[][]
  ) => void;
  clearDirections: () => void;
  onRouteReady: (result: { distance: number; duration: number }) => void;
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
  },
};

export function useDirections(): DirectionsResult {
  const [state, setState] = useState<DirectionsState>(initialState);

  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  const startDirections = useCallback(
    (origin: Coordinates, destination: Coordinates) => {
      setState({ origin, destination, isActive: true, loading: false, error: null, routeInfo: { distance: null, duration: null } });
    },
    []
  );

  const startDirectionsToBuilding = useCallback(
    (origin: Location.LocationObject, buildingPolygon: number[][]) => {
      const originCoords = locationToCoordinates(origin);
      const destinationCoords = getInteriorPoint(buildingPolygon);

      setState({ origin: originCoords, destination: destinationCoords, isActive: true, loading: false, error: null, routeInfo: { distance: null, duration: null } });
    },
    []
  );

  const clearDirections = useCallback(() => {
    setState(initialState);
  }, []);

  const onRouteReady = useCallback(
    (result: { distance: number; duration: number }) => {
      setState((prev) => ({ ...prev, routeInfo: { distance: result.distance, duration: result.duration } }));
    },
    []
  );

  return { state, apiKey, startDirections, startDirectionsToBuilding, clearDirections, onRouteReady };
}
