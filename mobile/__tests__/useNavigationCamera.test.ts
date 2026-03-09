import { renderHook, act } from '@testing-library/react-native';
import { useNavigationCamera } from '../hooks/useNavigationCamera';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
}));

jest.mock('react-native-maps', () => ({
  default: class MockMapView {},
}));

// ---------------------------------------------------------------------------
// Shared helpers & fixtures
// ---------------------------------------------------------------------------

const ANIMATION_DURATION = 600;

const defaultCampus = {
  initialRegion: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
};

const alternateCampus = {
  initialRegion: {
    latitude: 45.458,
    longitude: -73.638,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
};

const inactiveState: any = {
  isActive: false,
  origin: null,
  destination: null,
  loading: false,
  error: null,
  routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
  steps: [],
  currentStepIndex: 0,
  routeCoordinates: [],
  isOffRoute: false,
  transportMode: 'WALKING',
};

const activeState: any = {
  ...inactiveState,
  isActive: true,
  origin: { latitude: 45.497, longitude: -73.579 },
  destination: { latitude: 45.458, longitude: -73.638 },
};

const sampleLocation: any = {
  coords: { latitude: 45.497, longitude: -73.58 },
  timestamp: Date.now(),
};

const updatedLocation: any = {
  coords: { latitude: 45.498, longitude: -73.581 },
  timestamp: Date.now(),
};

const sampleCoordinates = [
  { latitude: 45.497, longitude: -73.579 },
  { latitude: 45.458, longitude: -73.638 },
];

const mockOnRouteReady = jest.fn();
const mockCheckProgress = jest.fn();
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();

function makeParams(overrides: Record<string, any> = {}) {
  return {
    directionsState: inactiveState,
    location: null,
    selectedCampus: defaultCampus,
    onRouteReady: mockOnRouteReady,
    checkProgress: mockCheckProgress,
    ...overrides,
  };
}

/** Attach mock map methods to the ref returned by the hook. */
function attachMockRef(mapRef: React.MutableRefObject<any>) {
  mapRef.current = {
    animateToRegion: mockAnimateToRegion,
    fitToCoordinates: mockFitToCoordinates,
  };
}

// ---------------------------------------------------------------------------

describe('useNavigationCamera', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Return shape ---

  it('returns mapRef and handleRouteReady', () => {
    const { result } = renderHook(() => useNavigationCamera(makeParams()));
    expect(result.current.mapRef).toBeDefined();
    expect(typeof result.current.handleRouteReady).toBe('function');
  });

  // --- Campus effect ---

  it('animates to the new campus region when selectedCampus changes', () => {
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams() }
    );
    attachMockRef(result.current.mapRef);

    act(() => {
      rerender(makeParams({ selectedCampus: alternateCampus }));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      alternateCampus.initialRegion,
      ANIMATION_DURATION
    );
  });

  it('does not animate to region when selectedCampus is unchanged', () => {
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams() }
    );
    attachMockRef(result.current.mapRef);

    act(() => {
      // Re-render with same campus — effect should NOT fire again
      rerender(makeParams({ directionsState: activeState }));
    });

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  // --- checkProgress ---

  it('calls checkProgress with current coords when location changes while active', () => {
    const { rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: activeState }) }
    );

    act(() => {
      rerender(makeParams({ directionsState: activeState, location: sampleLocation }));
    });

    expect(mockCheckProgress).toHaveBeenCalledWith({
      latitude: sampleLocation.coords.latitude,
      longitude: sampleLocation.coords.longitude,
    });
  });

  it('calls checkProgress every time location updates while active', () => {
    const { rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: activeState, location: sampleLocation }) }
    );

    act(() => {
      rerender(makeParams({ directionsState: activeState, location: updatedLocation }));
    });

    expect(mockCheckProgress).toHaveBeenCalledTimes(2);
    expect(mockCheckProgress).toHaveBeenLastCalledWith({
      latitude: updatedLocation.coords.latitude,
      longitude: updatedLocation.coords.longitude,
    });
  });

  it('does not call checkProgress when directions are inactive', () => {
    renderHook(() => useNavigationCamera(makeParams({ location: sampleLocation })));
    expect(mockCheckProgress).not.toHaveBeenCalled();
  });

  it('stops calling checkProgress after navigation ends', () => {
    const { rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: activeState, location: sampleLocation }) }
    );

    act(() => {
      rerender(makeParams({ directionsState: inactiveState, location: sampleLocation }));
    });

    // At most the initial render call counts; a location-only change while inactive must NOT call again
    const callsAfterInactive = mockCheckProgress.mock.calls.length;
    act(() => {
      rerender(makeParams({ directionsState: inactiveState, location: updatedLocation }));
    });

    expect(mockCheckProgress.mock.calls.length).toBe(callsAfterInactive);
  });

  // --- Center on user location on first activation ---

  it('centers the map on the user when navigation first becomes active', () => {
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ location: sampleLocation }) }
    );
    attachMockRef(result.current.mapRef);

    act(() => {
      rerender(makeParams({ directionsState: activeState, location: sampleLocation }));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: sampleLocation.coords.latitude,
        longitude: sampleLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      ANIMATION_DURATION
    );
  });

  it('does NOT center the map a second time when location updates during the same session', () => {
    // Mount immediately active with a location → didCenterOnStartRef is set to true on mount
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: activeState, location: sampleLocation }) }
    );
    // Attach mock AFTER mount so we only capture post-mount calls
    attachMockRef(result.current.mapRef);

    act(() => {
      rerender(makeParams({ directionsState: activeState, location: updatedLocation }));
    });

    // animateToRegion should NOT be called because we already centered this session
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it('re-centers on the user when navigation starts a second time (after ending)', () => {
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ location: sampleLocation }) }
    );

    // --- First activation ---
    act(() => {
      rerender(makeParams({ directionsState: activeState, location: sampleLocation }));
    });
    attachMockRef(result.current.mapRef);

    // --- End navigation (resets didCenterOnStartRef) ---
    act(() => {
      rerender(makeParams({ directionsState: inactiveState, location: sampleLocation }));
    });

    mockAnimateToRegion.mockClear();

    // --- Second activation ---
    act(() => {
      rerender(makeParams({ directionsState: activeState, location: updatedLocation }));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: updatedLocation.coords.latitude,
        longitude: updatedLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }),
      ANIMATION_DURATION
    );
  });

  // --- handleRouteReady ---

  it('always calls onRouteReady with the result object', () => {
    const { result } = renderHook(() => useNavigationCamera(makeParams()));
    const routeResult = { distance: 2.4, duration: 15 };

    act(() => { result.current.handleRouteReady(routeResult); });

    expect(mockOnRouteReady).toHaveBeenCalledWith(routeResult);
  });

  it('calls fitToCoordinates with PREVIEW padding when navigation is inactive', () => {
    const { result } = renderHook(() =>
      useNavigationCamera(makeParams({ directionsState: inactiveState }))
    );
    attachMockRef(result.current.mapRef);

    act(() => {
      result.current.handleRouteReady({ coordinates: sampleCoordinates });
    });

    expect(mockFitToCoordinates).toHaveBeenCalledWith(sampleCoordinates, {
      edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
      animated: true,
    });
  });

  it('calls fitToCoordinates with NAVIGATION padding when first route is ready after activation', () => {
    // Start inactive so shouldFitRoute begins false
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: inactiveState }) }
    );
    attachMockRef(result.current.mapRef);

    // Activate → shouldFitRoute becomes true
    act(() => {
      rerender(makeParams({ directionsState: activeState }));
    });

    act(() => {
      result.current.handleRouteReady({ coordinates: sampleCoordinates });
    });

    expect(mockFitToCoordinates).toHaveBeenCalledWith(sampleCoordinates, {
      edgePadding: { top: 160, right: 50, bottom: 220, left: 50 },
      animated: true,
    });
  });

  it('does NOT call fitToCoordinates a second time for the same active session', () => {
    const { result, rerender } = renderHook(
      (props: any) => useNavigationCamera(props),
      { initialProps: makeParams({ directionsState: inactiveState }) }
    );
    attachMockRef(result.current.mapRef);

    act(() => { rerender(makeParams({ directionsState: activeState })); });

    // First call sets shouldFitRoute = false
    act(() => { result.current.handleRouteReady({ coordinates: sampleCoordinates }); });
    mockFitToCoordinates.mockClear();

    // Second call in the same session must NOT fit again
    act(() => { result.current.handleRouteReady({ coordinates: sampleCoordinates }); });

    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  it('does NOT call fitToCoordinates when result has no coordinates', () => {
    const { result } = renderHook(() => useNavigationCamera(makeParams()));
    attachMockRef(result.current.mapRef);

    act(() => { result.current.handleRouteReady({}); });
    act(() => { result.current.handleRouteReady({ coordinates: [] }); });

    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  it('does NOT call fitToCoordinates when mapRef is not yet attached', () => {
    const { result } = renderHook(() => useNavigationCamera(makeParams()));
    // Intentionally skip attachMockRef

    act(() => { result.current.handleRouteReady({ coordinates: sampleCoordinates }); });

    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });
});
