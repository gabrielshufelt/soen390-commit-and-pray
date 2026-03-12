import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouting } from '../hooks/useRouting';
import * as Location from 'expo-location';

// ── Mock useDirections ────────────────────────────────────────────────────────
const mockStartDirections = jest.fn();
const mockPreviewDirections = jest.fn();
const mockStartDirectionsToBuilding = jest.fn();
const mockEndDirections = jest.fn();
const mockOnRouteReady = jest.fn();
const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
const mockCheckProgress = jest.fn();
const mockSetTransportMode = jest.fn();
const mockSetPreviewRouteInfo = jest.fn();

const makeDirectionsReturn = (transportMode = 'WALKING' as const) => ({
  state: {
    origin: null, destination: null, isActive: false,
    loading: false, error: null, transportMode,
    routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
    steps: [], currentStepIndex: 0, routeCoordinates: [], isOffRoute: false,
  },
  apiKey: 'test-key',
  startDirections: mockStartDirections,
  previewDirections: mockPreviewDirections,
  startDirectionsToBuilding: mockStartDirectionsToBuilding,
  endDirections: mockEndDirections,
  onRouteReady: mockOnRouteReady,
  nextStep: mockNextStep,
  prevStep: mockPrevStep,
  checkProgress: mockCheckProgress,
  setTransportMode: mockSetTransportMode,
  previewRouteInfo: { distance: null, duration: null, distanceText: null, durationText: null },
  setPreviewRouteInfo: mockSetPreviewRouteInfo,
});

jest.mock('../hooks/useDirections', () => ({
  useDirections: jest.fn(),
}));

jest.mock('../utils/geometry', () => ({
  getInteriorPoint: jest.fn(() => ({ latitude: 45.497, longitude: -73.579 })),
}));

jest.mock('../utils/buildingCoordinates', () => ({
  getBuildingCoordinate: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { googleMapsApiKey: 'test-key' } },
}));

const { useDirections } = require('../hooks/useDirections');
const { getBuildingCoordinate } = require('../utils/buildingCoordinates');

// ── Test data ─────────────────────────────────────────────────────────────────
const sgwLocation: Location.LocationObject = {
  coords: {
    latitude: 45.4972, longitude: -73.579,
    altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null,
  },
  timestamp: Date.now(),
} as unknown as Location.LocationObject;

const mockUserBuilding = {
  id: 'H',
  name: 'Hall Building',
  code: 'H',
  coordinates: [[-73.579, 45.497], [-73.578, 45.497]] as [number, number][],
  properties: {},
};

const mockBuilding = {
  id: 'MB',
  properties: { name: 'Molson Building', code: 'MB' },
  geometry: { coordinates: [[[-73.578, 45.495], [-73.577, 45.495]]] },
};

const defaultParams = {
  effectiveLocation: sgwLocation,
  userBuilding: null as any,
  campusKey: 'SGW',
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('useRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDirections.mockReturnValue(makeDirectionsReturn());
  });

  // ── auto-startChoice effect ──────────────────────────────────────────────
  describe('auto-startChoice effect', () => {
    it('sets startChoice to current location when no userBuilding', async () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      await waitFor(() => expect(result.current.startChoice).not.toBeNull());
      expect(result.current.startChoice).toEqual(expect.objectContaining({
        id: 'current-location',
        name: 'My Current Location',
        coordinate: { latitude: 45.4972, longitude: -73.579 },
      }));
    });

    it('sets startChoice to building when userBuilding is truthy', async () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, userBuilding: mockUserBuilding })
      );
      await waitFor(() => expect(result.current.startChoice).not.toBeNull());
      expect(result.current.startChoice).toEqual(expect.objectContaining({
        id: 'H',
        name: 'Hall Building',
        code: 'H',
      }));
    });

    it('does not set startChoice when effectiveLocation is null', async () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      await act(async () => {});
      expect(result.current.startChoice).toBeNull();
    });

    it('does not overwrite a manually set startChoice', async () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      const manual = { id: 'MB', name: 'Molson', coordinate: { latitude: 45.495, longitude: -73.578 } };
      act(() => { result.current.setStartChoice(manual); });
      await act(async () => {});
      expect(result.current.startChoice?.id).toBe('MB');
    });
  });

  // ── shuttleWaypoints ─────────────────────────────────────────────────────
  describe('shuttleWaypoints', () => {
    it('returns undefined when shuttle is disabled', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      expect(result.current.shuttleWaypoints).toBeUndefined();
    });

    it('returns [SGW stop, Loyola stop] when campus is SGW', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.setUseShuttle(true); });
      expect(result.current.shuttleWaypoints).toHaveLength(2);
    });

    it('returns [Loyola stop, SGW stop] when campus is Loyola', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => {
        result.current.setUseShuttle(true);
        result.current.setShuttleCampus('Loyola');
      });
      expect(result.current.shuttleWaypoints).toHaveLength(2);
    });
  });

  // ── effectiveMode ────────────────────────────────────────────────────────
  describe('effectiveMode', () => {
    it('is DRIVING when shuttle is enabled regardless of transportMode', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.setUseShuttle(true); });
      expect(result.current.effectiveMode).toBe('DRIVING');
    });

    it('mirrors transportMode when shuttle is disabled', () => {
      useDirections.mockReturnValue(makeDirectionsReturn('TRANSIT'));
      const { result } = renderHook(() => useRouting(defaultParams));
      expect(result.current.effectiveMode).toBe('TRANSIT');
    });
  });

  // ── handleStartRoute ─────────────────────────────────────────────────────
  describe('handleStartRoute', () => {
    it('calls startDirections with location coords and destChoice', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => {
        result.current.setDestChoice({ id: 'H', name: 'Hall', coordinate: { latitude: 45.497, longitude: -73.579 } });
      });
      act(() => { result.current.handleStartRoute(); });
      expect(mockStartDirections).toHaveBeenCalledWith(
        { latitude: 45.4972, longitude: -73.579 },
        { latitude: 45.497, longitude: -73.579 }
      );
    });

    it('does nothing when destChoice is null', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleStartRoute(); });
      expect(mockStartDirections).not.toHaveBeenCalled();
    });

    it('does nothing when effectiveLocation is null', () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      act(() => {
        result.current.setDestChoice({ id: 'H', name: 'Hall', coordinate: { latitude: 45.497, longitude: -73.579 } });
        result.current.handleStartRoute();
      });
      expect(mockStartDirections).not.toHaveBeenCalled();
    });
  });

  // ── handleEndDirections ──────────────────────────────────────────────────
  describe('handleEndDirections', () => {
    it('calls endDirections and clears start, dest, and shuttle state', () => {
      // Use null location so the auto-startChoice effect does not re-populate after clear
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      act(() => {
        result.current.setStartChoice({ id: 'H', name: 'Hall', coordinate: { latitude: 45.497, longitude: -73.579 } });
        result.current.setDestChoice({ id: 'MB', name: 'Molson', coordinate: { latitude: 45.495, longitude: -73.578 } });
        result.current.setUseShuttle(true);
      });
      act(() => { result.current.handleEndDirections(); });
      expect(mockEndDirections).toHaveBeenCalled();
      expect(result.current.startChoice).toBeNull();
      expect(result.current.destChoice).toBeNull();
      expect(result.current.useShuttle).toBe(false);
    });

    it('resets previewRouteInfo', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleEndDirections(); });
      expect(mockSetPreviewRouteInfo).toHaveBeenCalledWith({
        distance: null, duration: null, distanceText: null, durationText: null,
      });
    });
  });

  // ── handlePreviewRoute ───────────────────────────────────────────────────
  describe('handlePreviewRoute', () => {
    it('calls previewDirections with start and dest coordinates', () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      act(() => {
        result.current.setStartChoice({ id: 'H', name: 'Hall', coordinate: { latitude: 45.497, longitude: -73.579 } });
        result.current.setDestChoice({ id: 'MB', name: 'Molson', coordinate: { latitude: 45.495, longitude: -73.578 } });
      });
      act(() => { result.current.handlePreviewRoute(); });
      expect(mockPreviewDirections).toHaveBeenCalledWith(
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.495, longitude: -73.578 }
      );
    });

    it('does nothing when destChoice is null', () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      act(() => { result.current.handlePreviewRoute(); });
      expect(mockPreviewDirections).not.toHaveBeenCalled();
    });

    it('does nothing when startChoice is current-location', async () => {
      // With a real location and no userBuilding, auto-effect sets start to current-location
      const { result } = renderHook(() => useRouting(defaultParams));
      await waitFor(() => expect(result.current.startChoice?.id).toBe('current-location'));
      act(() => {
        result.current.setDestChoice({ id: 'MB', name: 'Molson', coordinate: { latitude: 45.495, longitude: -73.578 } });
        result.current.handlePreviewRoute();
      });
      expect(mockPreviewDirections).not.toHaveBeenCalled();
    });

    it('alerts and blocks when start and dest are the same building', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      const same = { id: 'H', name: 'Hall', coordinate: { latitude: 45.497, longitude: -73.579 } };
      // Set state first, then call handler in a separate act so the callback sees updated state
      act(() => {
        result.current.setStartChoice(same);
        result.current.setDestChoice(same);
      });
      act(() => { result.current.handlePreviewRoute(); });
      expect(alertSpy).toHaveBeenCalledWith('Start and destination cannot be the same building.');
      expect(mockPreviewDirections).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  // ── handleNextClassDirections ────────────────────────────────────────────
  describe('handleNextClassDirections', () => {
    it('does nothing when effectiveLocation is null', () => {
      const { result } = renderHook(() =>
        useRouting({ ...defaultParams, effectiveLocation: null })
      );
      act(() => { result.current.handleNextClassDirections('H'); });
      expect(mockStartDirections).not.toHaveBeenCalled();
    });

    it('calls startDirections when building coordinate is found', () => {
      getBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleNextClassDirections('H'); });
      expect(mockStartDirections).toHaveBeenCalledWith(
        { latitude: 45.4972, longitude: -73.579 },
        { latitude: 45.497, longitude: -73.579 }
      );
    });

    it('shows an alert when building coordinate is not found', () => {
      getBuildingCoordinate.mockReturnValue(null);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleNextClassDirections('UNKNOWN'); });
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Could not find coordinates for this building.');
      expect(mockStartDirections).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  // ── handleDirectionsFrom / handleDirectionsTo ────────────────────────────
  describe('handleDirectionsFrom / handleDirectionsTo', () => {
    it('sets startChoice from a building object', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleDirectionsFrom(mockBuilding); });
      expect(result.current.startChoice).toEqual(expect.objectContaining({
        id: 'MB',
        name: 'Molson Building',
        campus: 'SGW',
      }));
    });

    it('sets destChoice from a building object', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleDirectionsTo(mockBuilding); });
      expect(result.current.destChoice).toEqual(expect.objectContaining({
        id: 'MB',
        name: 'Molson Building',
      }));
    });

    it('uses code as name fallback when building has no name', () => {
      const noName = { ...mockBuilding, properties: { code: 'MB' } };
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleDirectionsFrom(noName); });
      expect(result.current.startChoice?.name).toBe('MB');
    });
  });

  // ── handleShowShuttleRoute ───────────────────────────────────────────────
  describe('handleShowShuttleRoute', () => {
    it('starts directions between the two shuttle bus stops', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleShowShuttleRoute(); });
      expect(mockStartDirections).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) }),
        expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) })
      );
    });
  });

  // ── handleRoutePreviewReady ──────────────────────────────────────────────
  describe('handleRoutePreviewReady', () => {
    it('formats distance and duration into text', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleRoutePreviewReady({ distance: 1.5, duration: 10 }); });
      expect(mockSetPreviewRouteInfo).toHaveBeenCalledWith({
        distance: 1.5, duration: 10,
        distanceText: '1.5 km', durationText: '10 min',
      });
    });

    it('sets distanceText to null when distance is falsy', () => {
      const { result } = renderHook(() => useRouting(defaultParams));
      act(() => { result.current.handleRoutePreviewReady({ distance: 0, duration: 5 }); });
      expect(mockSetPreviewRouteInfo).toHaveBeenCalledWith(
        expect.objectContaining({ distanceText: null })
      );
    });
  });
});
