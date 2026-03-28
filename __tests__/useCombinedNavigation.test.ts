import { renderHook, act } from '@testing-library/react-native';
import { useCombinedNavigation } from '../hooks/useCombinedNavigation';
import { getStitchedRoute, type CombinedNavigationStep } from '../utils/routeAggregator';
import { fetchOutdoorRoute } from '../utils/googleMapsService';
import { useDirections } from '../hooks/useDirections';

jest.mock('../utils/routeAggregator');
jest.mock('../utils/googleMapsService');
jest.mock('../hooks/useDirections');

const mockedGetStitchedRoute = jest.mocked(getStitchedRoute);
const mockedFetchOutdoorRoute = jest.mocked(fetchOutdoorRoute);
const mockedUseDirections = jest.mocked(useDirections);

describe('useCombinedNavigation', () => {
  const mockApiKey = 'test-api-key-123';
  const mockStartLocation = 'Building A';
  const mockEndLocation = 'Building B';
  const mockUserLocation = { latitude: 45.4972, longitude: -73.579 };

  const mockCombinedRouteStep: CombinedNavigationStep = {
    instruction: 'Head to Building B',
    distance: '100m',
    source: 'outdoor',
    coordinates: { latitude: 45.495, longitude: -73.577 },
    maneuver: 'straight',
  };

  const mockCombinedRouteSteps: CombinedNavigationStep[] = [
    mockCombinedRouteStep,
    {
      instruction: 'Enter Building B',
      distance: '50m',
      source: 'indoor',
      buildingCode: 'BB',
      floor: 1,
      coordinates: { latitude: 45.4955, longitude: -73.5765 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseDirections.mockReturnValue({
      apiKey: mockApiKey,
      state: {
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
      },
      startDirections: jest.fn(),
      updateUserLocation: jest.fn(),
      setTransportMode: jest.fn(),
      clearDirections: jest.fn(),
      getNavigationProgress: jest.fn(),
    } as any);
  });

  describe('initial state', () => {
    it('initializes with empty fullRoute and isCalculating false', () => {
      const { result } = renderHook(() => useCombinedNavigation());

      expect(result.current.fullRoute).toEqual([]);
      expect(result.current.isCalculating).toBe(false);
    });

    it('does not require useDirections hook on initialization', () => {
      renderHook(() => useCombinedNavigation());

      expect(mockedUseDirections).not.toHaveBeenCalled();
    });
  });

  describe('calculateRoute', () => {
    it('returns the calculated route on success', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      let returnedRoute: CombinedNavigationStep[] = [];
      await act(async () => {
        returnedRoute = await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(returnedRoute).toEqual(mockCombinedRouteSteps);
      expect(result.current.fullRoute).toEqual(mockCombinedRouteSteps);
    });

    it('successfully calculates and sets a combined route', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      expect(result.current.isCalculating).toBe(false);

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual(mockCombinedRouteSteps);
      expect(result.current.isCalculating).toBe(false);
    });

    it('sets isCalculating to false after route calculation completes', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      expect(result.current.isCalculating).toBe(false);

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.fullRoute).toEqual(mockCombinedRouteSteps);
    });

    it('calls getStitchedRoute with correct parameters', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          true,
          'TRANSIT',
          mockUserLocation
        );
      });

      expect(mockedGetStitchedRoute).toHaveBeenCalledWith(
        mockStartLocation,
        mockEndLocation,
        true,
        'TRANSIT',
        mockUserLocation,
        expect.any(Function)
      );
    });

    it('passes fetchOutdoorRoute callback to getStitchedRoute', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      const callArgs = mockedGetStitchedRoute.mock.calls[0];
      const outdoorRouteCallback = callArgs[5];

      expect(typeof outdoorRouteCallback).toBe('function');
    });

    it('uses correct transport mode when calling fetchOutdoorRoute', async () => {
      const mockOutdoorSteps: CombinedNavigationStep[] = [
        {
          instruction: 'Head south',
          distance: '200m',
          source: 'outdoor',
          coordinates: mockUserLocation,
        },
      ];

      mockedGetStitchedRoute.mockImplementationOnce(
        (origin, dest, accessible, mode, userLoc, fetchCallback) => {
          return fetchCallback(userLoc, { latitude: 45.5, longitude: -73.6 }, mode);
        }
      );

      mockedFetchOutdoorRoute.mockResolvedValueOnce(mockOutdoorSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'WALKING',
          mockUserLocation,
          mockApiKey
        );
      });

      expect(mockedFetchOutdoorRoute).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'WALKING',
        mockApiKey
      );
    });

    it('handles errors gracefully and sets isCalculating to false', async () => {
      const testError = new Error('Route calculation failed');
      mockedGetStitchedRoute.mockRejectedValueOnce(testError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.fullRoute).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('returns an empty array on error', async () => {
      mockedGetStitchedRoute.mockRejectedValueOnce(new Error('Boom'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useCombinedNavigation());

      let returnedRoute: CombinedNavigationStep[] = [mockCombinedRouteStep];
      await act(async () => {
        returnedRoute = await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(returnedRoute).toEqual([]);
      expect(result.current.fullRoute).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    it('clears an existing fullRoute when a later calculation fails', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);
      mockedGetStitchedRoute.mockRejectedValueOnce(new Error('Later failure'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });
      expect(result.current.fullRoute).toEqual(mockCombinedRouteSteps);

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          'Broken destination',
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    it('handles accessible parameter correctly', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          true,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(mockedGetStitchedRoute).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        true,
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('returns empty array when destination parsing fails', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          'Invalid Location',
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual([]);
      expect(result.current.isCalculating).toBe(false);
    });
  });

  describe('multiple route calculations', () => {
    it('replaces previous route with new calculation', async () => {
      const firstRoute: CombinedNavigationStep[] = [
        {
          instruction: 'First route',
          distance: '100m',
          source: 'outdoor',
          coordinates: mockUserLocation,
        },
      ];

      const secondRoute: CombinedNavigationStep[] = [
        {
          instruction: 'Second route',
          distance: '200m',
          source: 'outdoor',
          coordinates: mockUserLocation,
        },
      ];

      mockedGetStitchedRoute.mockResolvedValueOnce(firstRoute);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual(firstRoute);

      mockedGetStitchedRoute.mockResolvedValueOnce(secondRoute);

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          'Building C',
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual(secondRoute);
    });
  });

  describe('clearRoute', () => {
    it('clears fullRoute after a successful route calculation', async () => {
      mockedGetStitchedRoute.mockResolvedValueOnce(mockCombinedRouteSteps);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'DRIVING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual(mockCombinedRouteSteps);

      act(() => {
        result.current.clearRoute();
      });

      expect(result.current.fullRoute).toEqual([]);
    });

    it('is safe to call when fullRoute is already empty', () => {
      const { result } = renderHook(() => useCombinedNavigation());

      expect(result.current.fullRoute).toEqual([]);
      act(() => {
        result.current.clearRoute();
      });
      expect(result.current.fullRoute).toEqual([]);
    });
  });

  describe('route with both indoor and outdoor segments', () => {
    it('maintains combined route structure', async () => {
      const mixedRoute: CombinedNavigationStep[] = [
        {
          instruction: 'Exit Building A',
          distance: '30m',
          source: 'indoor',
          buildingCode: 'BA',
          floor: 1,
          coordinates: { latitude: 45.49, longitude: -73.58 },
        },
        {
          instruction: 'Head towards Building B',
          distance: '150m',
          source: 'outdoor',
          maneuver: 'straight',
          coordinates: { latitude: 45.495, longitude: -73.577 },
        },
        {
          instruction: 'Enter Building B',
          distance: '20m',
          source: 'indoor',
          buildingCode: 'BB',
          floor: 0,
          coordinates: { latitude: 45.4955, longitude: -73.5765 },
        },
      ];

      mockedGetStitchedRoute.mockResolvedValueOnce(mixedRoute);

      const { result } = renderHook(() => useCombinedNavigation());

      await act(async () => {
        await result.current.calculateRoute(
          mockStartLocation,
          mockEndLocation,
          false,
          'WALKING',
          mockUserLocation
        );
      });

      expect(result.current.fullRoute).toEqual(mixedRoute);
      expect(result.current.fullRoute.length).toBe(3);
      expect(
        result.current.fullRoute.filter((step) => step.source === 'indoor')
      ).toHaveLength(2);
      expect(
        result.current.fullRoute.filter((step) => step.source === 'outdoor')
      ).toHaveLength(1);
    });
  });
});
