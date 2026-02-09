import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

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

export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<Coordinates> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { latitude: lat, longitude: lng };
}

interface DirectionsResult {
  state: DirectionsState;
  apiKey: string;
  startDirections: (origin: Coordinates, destination: Coordinates) => void;
  startDirectionsWithAddress: (
    origin: Location.LocationObject,
    destinationAddress: string
  ) => Promise<void>;
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

  const startDirectionsWithAddress = useCallback(
    async (origin: Location.LocationObject, destinationAddress: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const originCoords = locationToCoordinates(origin);
        const destinationCoords = await geocodeAddress(destinationAddress, apiKey);

        setState({ origin: originCoords, destination: destinationCoords, isActive: true, loading: false, error: null, routeInfo: { distance: null, duration: null } });
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Geocoding failed' }));
      }
    },
    [apiKey]
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

  return { state, apiKey, startDirections, startDirectionsWithAddress, clearDirections, onRouteReady };
}
