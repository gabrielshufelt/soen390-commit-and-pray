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
        distanceText: null,
        durationText: null,
      });
      // Other state should remain unchanged
      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.origin).toEqual(mockOrigin);
    });

    it('populates steps from legs data', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                {
                  html_instructions: 'Head north on Example St',
                  distance: { text: '200 m', value: 200 },
                  duration: { text: '2 min', value: 120 },
                  maneuver: 'straight',
                  start_location: { lat: 45.496, lng: -73.578 },
                  end_location: { lat: 45.497, lng: -73.579 },
                },
              ],
            },
          ],
        });
      });

      expect(result.current.state.steps).toHaveLength(1);
      expect(result.current.state.steps[0].instruction).toBe('Head north on Example St');
      expect(result.current.state.routeInfo.distanceText).toBe('1 km');
      expect(result.current.state.routeInfo.durationText).toBe('5 min');
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
      });
    });
  });

  describe('previewDirections', () => {
    it('sets origin and destination with isActive=false', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.previewDirections(mockOrigin, mockDestination);
      });

      expect(result.current.state.origin).toEqual(mockOrigin);
      expect(result.current.state.destination).toEqual(mockDestination);
      expect(result.current.state.isActive).toBe(false);
    });
  });

  describe('nextStep', () => {
    it('increments currentStepIndex', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                {
                  html_instructions: 'Step 1',
                  distance: { text: '100 m', value: 100 },
                  duration: { text: '1 min', value: 60 },
                  start_location: { lat: 45.496, lng: -73.578 },
                  end_location: { lat: 45.497, lng: -73.579 },
                },
                {
                  html_instructions: 'Step 2',
                  distance: { text: '200 m', value: 200 },
                  duration: { text: '2 min', value: 120 },
                  start_location: { lat: 45.497, lng: -73.579 },
                  end_location: { lat: 45.498, lng: -73.580 },
                },
              ],
            },
          ],
        });
      });

      expect(result.current.state.currentStepIndex).toBe(0);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStepIndex).toBe(1);
    });

    it('does not exceed the last step index', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                {
                  html_instructions: 'Only step',
                  distance: { text: '100 m', value: 100 },
                  duration: { text: '1 min', value: 60 },
                  start_location: { lat: 45.496, lng: -73.578 },
                  end_location: { lat: 45.497, lng: -73.579 },
                },
              ],
            },
          ],
        });
      });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStepIndex).toBe(0);
    });
  });

  describe('prevStep', () => {
    it('decrements currentStepIndex', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                {
                  html_instructions: 'Step 1',
                  distance: { text: '100 m', value: 100 },
                  duration: { text: '1 min', value: 60 },
                  start_location: { lat: 45.496, lng: -73.578 },
                  end_location: { lat: 45.497, lng: -73.579 },
                },
                {
                  html_instructions: 'Step 2',
                  distance: { text: '200 m', value: 200 },
                  duration: { text: '2 min', value: 120 },
                  start_location: { lat: 45.497, lng: -73.579 },
                  end_location: { lat: 45.498, lng: -73.580 },
                },
              ],
            },
          ],
        });
      });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStepIndex).toBe(1);

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStepIndex).toBe(0);
    });

    it('does not go below zero', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                {
                  html_instructions: 'Only step',
                  distance: { text: '100 m', value: 100 },
                  duration: { text: '1 min', value: 60 },
                  start_location: { lat: 45.496, lng: -73.578 },
                  end_location: { lat: 45.497, lng: -73.579 },
                },
              ],
            },
          ],
        });
      });

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStepIndex).toBe(0);
    });
  });

  describe('checkProgress', () => {
    const STEP_END = { latitude: 45.497, longitude: -73.579 };
    const ROUTE_COORDS = [STEP_END];

    function makeGoogleStep(endLat: number, endLng: number) {
      return {
        html_instructions: 'Go straight',
        distance: { text: '100 m', value: 100 },
        duration: { text: '1 min', value: 60 },
        start_location: { lat: endLat - 0.001, lng: endLng },
        end_location: { lat: endLat, lng: endLng },
      };
    }

    it('does nothing when directions are not active', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.checkProgress(STEP_END);
      });

      expect(result.current.state.currentStepIndex).toBe(0);
      expect(result.current.state.isOffRoute).toBe(false);
    });

    it('does nothing when steps array is empty', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.checkProgress(STEP_END);
      });

      expect(result.current.state.currentStepIndex).toBe(0);
      expect(result.current.state.isOffRoute).toBe(false);
    });

    it('advances step when user reaches step endpoint', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                makeGoogleStep(STEP_END.latitude, STEP_END.longitude),
                makeGoogleStep(45.498, -73.580),
              ],
            },
          ],
          coordinates: [STEP_END, { latitude: 45.498, longitude: -73.580 }],
        });
      });

      act(() => {
        result.current.checkProgress(STEP_END);
      });

      expect(result.current.state.currentStepIndex).toBe(1);
    });

    it('stays at last step when endpoint is reached', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [makeGoogleStep(STEP_END.latitude, STEP_END.longitude)],
            },
          ],
          coordinates: ROUTE_COORDS,
        });
      });

      act(() => {
        result.current.checkProgress(STEP_END);
      });

      expect(result.current.state.currentStepIndex).toBe(0);
    });

    it('marks off-route when user is far from route', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                makeGoogleStep(STEP_END.latitude, STEP_END.longitude),
                makeGoogleStep(45.498, -73.580),
              ],
            },
          ],
          coordinates: [STEP_END, { latitude: 45.498, longitude: -73.580 }],
        });
      });

      // ~222 m away from STEP_END, well beyond the 50 m off-route threshold
      act(() => {
        result.current.checkProgress({ latitude: 45.499, longitude: -73.579 });
      });

      expect(result.current.state.isOffRoute).toBe(true);
    });

    it('does not change state when nothing changes', () => {
      const { result } = renderHook(() => useDirections());

      act(() => {
        result.current.startDirections(mockOrigin, mockDestination);
      });

      act(() => {
        result.current.onRouteReady({
          distance: 1.0,
          duration: 5,
          legs: [
            {
              distance: { text: '1 km', value: 1000 },
              duration: { text: '5 min', value: 300 },
              steps: [
                makeGoogleStep(STEP_END.latitude, STEP_END.longitude),
                makeGoogleStep(45.498, -73.580),
              ],
            },
          ],
          coordinates: [STEP_END, { latitude: 45.498, longitude: -73.580 }],
        });
      });

      // ~44 m from STEP_END — beyond 25 m step threshold, within 50 m of route
      act(() => {
        result.current.checkProgress({ latitude: 45.4974, longitude: -73.579 });
      });

      expect(result.current.state.currentStepIndex).toBe(0);
      expect(result.current.state.isOffRoute).toBe(false);
    });
  });


});
