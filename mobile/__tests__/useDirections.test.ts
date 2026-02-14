import { renderHook, act } from '@testing-library/react-native';
import { useDirections, locationToCoordinates } from '../hooks/useDirections';
import * as Location from 'expo-location';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      googleMapsApiKey: 'test-api-key',
    },
  },
}));

jest.mock('../utils/geometry', () => ({
  getInteriorPoint: jest.fn((polygon: number[][]) => ({
    latitude: 45.497,
    longitude: -73.579,
  })),
}));

describe('useDirections', () => {
  const mockLocation: Location.LocationObject = {
    coords: {
      latitude: 45.4972,
      longitude: -73.579,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };

  const mockPolygon: number[][] = [
    [-73.579, 45.497],
    [-73.578, 45.497],
    [-73.578, 45.498],
    [-73.579, 45.498],
    [-73.579, 45.497],
  ];

  const mockOrigin = { latitude: 45.4972, longitude: -73.579 };
  const mockDestination = { latitude: 45.495, longitude: -73.577 };

  describe('locationToCoordinates', () => {
    it('extracts latitude and longitude from LocationObject', () => {
      const result = locationToCoordinates(mockLocation);

      expect(result).toEqual({
        latitude: 45.4972,
        longitude: -73.579,
      });
    });
  });

  describe('initial state', () => {
    it('returns initial state with no active directions', () => {
      const { result } = renderHook(() => useDirections());

      expect(result.current.state).toEqual({
        origin: null,
        destination: null,
        isActive: false,
        loading: false,
        error: null,
        routeInfo: {
          distance: null,
          duration: null,
        },
      });
    });

    it('returns the API key from config', () => {
      const { result } = renderHook(() => useDirections());

      expect(result.current.apiKey).toBe('test-api-key');
    });
  });

  describe('startDirections', () => {
    it('sets origin and destination coordinates and activates directions', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.origin).toEqual(mockOrigin);
      expect(result.current.state.destination).toEqual(mockDestination);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('startDirectionsToBuilding', () => {
    it('converts location and polygon to coordinates and activates directions', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirectionsToBuilding(mockLocation, mockPolygon);
      });

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.origin).toEqual({
        latitude: 45.4972,
        longitude: -73.579,
      });
      expect(result.current.state.destination).toEqual({
        latitude: 45.497,
        longitude: -73.579,
      });
    });
  });

  describe('onRouteReady', () => {
    it('updates routeInfo with distance and duration', () => {
      const { result } = renderHook(() => useDirections());

      // First start directions
      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      // Then simulate route ready callback
      act(() => {
        result.current.onRouteReady({ distance: 2.5, duration: 15 });
      });

      expect(result.current.state.routeInfo).toEqual({
        distance: 2.5,
        duration: 15,
      });
      // Other state should remain unchanged
      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.origin).toEqual(mockOrigin);
    });
  });


describe('endDirections', () => {
    it('resets state to initial values', () => {
      const { result } = renderHook(() => useDirections());

      // First activate directions
      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      expect(result.current.state.isActive).toBe(true);

      // Then end directions
      act(() => {
        result.current.endDirections();
      });

      expect(result.current.state).toEqual({
        origin: null,
        destination: null,
        isActive: false,
        loading: false,
        error: null,
        routeInfo: {
          distance: null,
          duration: null,
        },
      });
    });
  });


});
