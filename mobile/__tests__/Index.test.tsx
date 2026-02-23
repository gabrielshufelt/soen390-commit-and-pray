import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import Index from '../app/(tabs)/index';
import { ThemeProvider } from '../context/ThemeContext';


jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { googleMapsApiKey: 'test-api-key' } },
}));

// --- Controllable hook mocks ---
const mockPermissionState = jest.fn();
const mockWatchLocation = jest.fn();
const mockUserBuilding = jest.fn();
const mockStartDirectionsToBuilding = jest.fn();
const mockOnRouteReady = jest.fn();
const mockDirectionsHook = jest.fn();
const mockEndDirections = jest.fn();
const mockStartDirections = jest.fn();
const mockPreviewDirections = jest.fn();
const mockCheckProgress = jest.fn();
const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
const mockSetTransportMode = jest.fn();

jest.mock('../hooks/useLocationPermissions', () => ({
  useLocationPermissions: () => mockPermissionState(),
}));

jest.mock('../hooks/useWatchLocation', () => ({
  useWatchLocation: () => mockWatchLocation(),
}));

jest.mock('../hooks/useUserBuilding', () => ({
  useUserBuilding: () => mockUserBuilding(),
}));

jest.mock('@/hooks/useDirections', () => ({
  useDirections: () => mockDirectionsHook(),
}));

// --- MapViewDirections mock with controllable behavior ---
let mockMapDirectionsBehavior: 'ready' | 'error' | 'none' = 'none';

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      React.useEffect(() => {
        if (mockMapDirectionsBehavior === 'ready' && props.onReady) {
          props.onReady({
            distance: 1.5,
            duration: 10,
            coordinates: [
              { latitude: 45.497, longitude: -73.579 },
              { latitude: 45.458, longitude: -73.639 },
            ],
          });
        }
        if (mockMapDirectionsBehavior === 'error' && props.onError) {
          props.onError('Route not found');
        }
      }, []);
      return <View testID="map-directions" {...props} />;
    },
  };
});

// --- react-native-maps mock ---
let mockPolygonRenderCount = 0;
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
    }));
    return (
      <View testID="map-view" {...props}>
        {props.children}
      </View>
    );
  });

  const MockPolygon = (props: any) => {
    mockPolygonRenderCount++;
    return <View testID="polygon" {...props} />;
  };

  const MockMarker = (props: any) => (
    <View testID="marker" {...props}>
      {props.children}
    </View>
  );

  return {
    __esModule: true,
    default: MockMapView,
    Polygon: MockPolygon,
    Marker: MockMarker,
  };
});


// --- Test Starting and Ending Directions ---
let mockSearchBarProperties: any = {};

jest.mock('../components/searchBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      mockSearchBarProperties = props;
      return <View testID="search-bar" />;
    },
  };
})



// --- Test data ---
const sgwLocation = {
  coords: { latitude: 45.4972, longitude: -73.579 },
  timestamp: Date.now(),
};

const outsideLocation = {
  coords: { latitude: 0, longitude: 0 },
  timestamp: Date.now(),
};

const defaultPermission = { granted: true, loading: false, error: null };
const deniedPermission = { granted: false, loading: false, error: 'denied' };

const defaultWatch = { location: sgwLocation, loading: false, error: null };
const noLocationWatch = { location: null, loading: false, error: null };
const outsideWatch = { location: outsideLocation, loading: false, error: null };


const defaultDirections = {
  state: {
    origin: null, destination: null, isActive: false,
    loading: false, error: null,
    routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
    steps: [], currentStepIndex: 0, routeCoordinates: [], isOffRoute: false,
    transportMode: 'WALKING' as const,
  },
  apiKey: 'test-api-key',
  startDirections: mockStartDirections,
  previewDirections: mockPreviewDirections,
  startDirectionsToBuilding: mockStartDirectionsToBuilding,
  endDirections: mockEndDirections,
  onRouteReady: mockOnRouteReady,
  nextStep: mockNextStep,
  prevStep: mockPrevStep,
  checkProgress: mockCheckProgress,
  setTransportMode: mockSetTransportMode,
  previewRouteInfo: {
    distance: null,
    duration: null,
    distanceText: null,
    durationText: null,
  },
  setPreviewRouteInfo: jest.fn(),
};

const activeDirections = {
  ...defaultDirections,
  state: {
    origin: { latitude: 45.497, longitude: -73.579 },
    destination: { latitude: 45.458, longitude: -73.639 },
    isActive: true,
    loading: false, error: null,
    routeInfo: { distance: null, duration: null, distanceText: null, durationText: null },
    steps: [], currentStepIndex: 0, routeCoordinates: [], isOffRoute: false,
    transportMode: 'WALKING' as const,
  },
};

const mockStep = {
  instruction: 'Turn left onto Rue Sainte-Catherine',
  distance: '200 m',
  duration: '2 min',
  maneuver: 'turn-left',
  startLocation: { latitude: 45.497, longitude: -73.579 },
  endLocation: { latitude: 45.496, longitude: -73.580 },
};

const activeDirectionsWithSteps = {
  ...activeDirections,
  state: {
    ...activeDirections.state,
    steps: [mockStep, { ...mockStep, instruction: 'Continue straight', maneuver: 'straight' }],
    currentStepIndex: 0,
    routeInfo: { distance: 1.2, duration: 8, distanceText: '1.2 km', durationText: '8 min' },
  },
};

function setupDefaults() {
  mockPermissionState.mockReturnValue(defaultPermission);
  mockWatchLocation.mockReturnValue(defaultWatch);
  mockUserBuilding.mockReturnValue(null);
  mockDirectionsHook.mockReturnValue(defaultDirections);
}

async function renderWithTheme(component: React.ReactElement) {
  const result = render(<ThemeProvider>{component}</ThemeProvider>);
  await act(async () => {});
  return result;
}

describe('<Index />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchBarProperties = {};
    mockPolygonRenderCount = 0;
    mockMapDirectionsBehavior = 'none';
    setupDefaults();
  });

  // --- Basic rendering ---
  it('renders MapView component', async () => {
    const { getByTestId } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  it('does not re-render building polygons on component re-render', async () => {
    const { rerender } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(mockPolygonRenderCount).toBeGreaterThan(0);
    });

    const initialRenderCount = mockPolygonRenderCount;
    rerender(<ThemeProvider><Index /></ThemeProvider>);
    await waitFor(() => {
      expect(mockPolygonRenderCount).toBe(initialRenderCount);
    });
  });

  // --- BuildingModal open/close ---
  it('opens BuildingModal when polygon is pressed', async () => {
    const { getAllByTestId, getByText } = await renderWithTheme(<Index />);
    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);
    await waitFor(() => {
      expect(getByText('Get Directions To')).toBeTruthy();
    });
  });

  it('closes BuildingModal when close button is pressed', async () => {
    const { getAllByTestId, getByTestId, queryByText } = await renderWithTheme(<Index />);
    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);
    fireEvent.press(getByTestId('close-button'));
    await waitFor(() => {
      expect(queryByText('Get Directions To')).toBeNull();
    });
  });

  // --- Permission denied ---
  it('shows permission required when location not granted', async () => {
    mockPermissionState.mockReturnValue(deniedPermission);
    mockWatchLocation.mockReturnValue(noLocationWatch);
    const { getByText } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('Location permission required')).toBeTruthy();
    });
  });

  // --- Location outside campus boundaries (also covers null location → undefined campus) ---
  it('shows outside campus boundaries for distant location', async () => {
    mockWatchLocation.mockReturnValue(outsideWatch);
    const { getByText } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('Outside campus boundaries')).toBeTruthy();
    });
  });

  // --- Location on campus ---
  it('shows campus name when on campus', async () => {
    const { getByText } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('SGW Campus')).toBeTruthy();
    });
  });

  // --- User inside a building ---
  it('shows building name when user is inside a building', async () => {
    mockUserBuilding.mockReturnValue({
      id: 'b1', name: 'Hall Building', code: 'H',
      coordinates: [], properties: {},
    });
    const { getByText } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText(/Inside: Hall Building/)).toBeTruthy();
    });
  });

  // --- Region change: hide labels ---
  it('hides building labels on zoom out', async () => {
    const { getByTestId, queryAllByTestId } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
      latitude: 45.497, longitude: -73.579,
      latitudeDelta: 0.05, longitudeDelta: 0.05,
    });

    await waitFor(() => {
      expect(queryAllByTestId('marker').length).toBe(0);
    });
  });

  // --- Region change: show labels ---
  it('shows building labels on zoom in', async () => {
    const { getByTestId, queryAllByTestId } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    // Zoom out to hide
    fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
      latitude: 45.497, longitude: -73.579,
      latitudeDelta: 0.05, longitudeDelta: 0.05,
    });
    await waitFor(() => {
      expect(queryAllByTestId('marker').length).toBe(0);
    });

    // Zoom in to show
    fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
      latitude: 45.497, longitude: -73.579,
      latitudeDelta: 0.005, longitudeDelta: 0.005,
    });
    await waitFor(() => {
      expect(queryAllByTestId('marker').length).toBeGreaterThan(0);
    });
  });

  // --- Campus toggle ---
  it('animates to new region when campus is toggled', async () => {
    const { getByText } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('Loyola')).toBeTruthy();
    });
    fireEvent.press(getByText('Loyola'));
    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalled();
    });
  });

  // --- Directions active ---
  it('renders MapViewDirections when directions are active', async () => {
    mockDirectionsHook.mockReturnValue(activeDirections);
    const { getByTestId } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-directions')).toBeTruthy();
    });
  });

  // --- onReady callback ---
  it('calls onRouteReady and fitToCoordinates when route is ready', async () => {
    mockMapDirectionsBehavior = 'ready';
    mockDirectionsHook.mockReturnValue(activeDirections);
    await renderWithTheme(<Index />);

    await waitFor(() => {
      expect(mockOnRouteReady).toHaveBeenCalledWith(
        expect.objectContaining({ distance: 1.5, duration: 10 })
      );
    });
    expect(mockFitToCoordinates).toHaveBeenCalledWith(
      [activeDirections.state.origin, activeDirections.state.destination],
      { edgePadding: { top: 160, right: 50, bottom: 220, left: 50 }, animated: true }
    );
  });

  // --- onError callback ---
  it('handles MapViewDirections error', async () => {
    mockMapDirectionsBehavior = 'error';
    mockDirectionsHook.mockReturnValue(activeDirections);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await renderWithTheme(<Index />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Index] MapViewDirections ERROR:', 'Route not found'
      );
    });
    consoleSpy.mockRestore();
  });

  // --- Dark mode ---
  it('renders in dark mode', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce('dark');
    const { getByTestId } = await renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  // -- Start and End Directions --
  describe('handleStartRoute', () => {

    it("Starts directions to building of choice with current location as origin", async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 }
        });
      });


      await waitFor(() => {
        expect(mockSearchBarProperties.destination).toBeTruthy();
      });

      mockSearchBarProperties.onStartRoute();

      expect(mockStartDirections).toHaveBeenCalledWith(
        { latitude: 45.4972, longitude: -73.579 },
        { latitude: 45.497, longitude: -73.579 }
      );
    });

    it('previews route from selected start building to destination', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onPreviewRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 }
        });
      });

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'MB',
          name: 'Molson Building',
          coordinate: { latitude: 45.495, longitude: -73.578 }
        });
      });

      await waitFor(() => {
        expect(mockSearchBarProperties.start).toBeTruthy();
        expect(mockSearchBarProperties.destination).toBeTruthy();
      });

      mockSearchBarProperties.onPreviewRoute();

      expect(mockPreviewDirections).toHaveBeenCalledWith(
        { latitude: 45.497, longitude: -73.579 }, // start building
        { latitude: 45.495, longitude: -73.578 }  // destination
      );
    });
  });

  describe('handleEndDirections', () => {
    it('calls endDirections and clears start and destination choices', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onEndRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 }
        });
      });

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'MB',
          name: 'Molson Building',
          coordinate: { latitude: 45.495, longitude: -73.578 }
        });
      });

      await waitFor(() => {
        mockSearchBarProperties.onEndRoute();
      });

      expect(mockEndDirections).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockSearchBarProperties.start).toBeNull();
        expect(mockSearchBarProperties.destination).toBeNull();
      });
    });
  });

  // --- SearchBar & CampusToggle hidden when directions are active ---
  describe('UI visibility when directions are active', () => {
    it('hides SearchBar when directions are active', async () => {
      mockDirectionsHook.mockReturnValue(activeDirections);
      const { queryByTestId } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(queryByTestId('search-bar')).toBeNull();
      });
    });

    it('shows SearchBar when directions are inactive', async () => {
      const { getByTestId } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(getByTestId('search-bar')).toBeTruthy();
      });
    });

    it('hides CampusToggle when directions are active', async () => {
      mockDirectionsHook.mockReturnValue(activeDirections);
      const { queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        // CampusToggle renders 'SGW' and 'Loyola' toggle buttons
        expect(queryByText('Loyola')).toBeNull();
      });
    });

    it('shows CampusToggle when directions are inactive', async () => {
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(getByText('Loyola')).toBeTruthy();
      });
    });
  });

  // --- NavigationSteps ---
  describe('NavigationSteps', () => {
    it('renders NavigationSteps when active with steps', async () => {
      mockDirectionsHook.mockReturnValue(activeDirectionsWithSteps);
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(getByText(/Turn left onto Rue Sainte-Catherine/)).toBeTruthy();
      });
    });

    it('does NOT render NavigationSteps when active but steps are empty', async () => {
      mockDirectionsHook.mockReturnValue(activeDirections);
      const { queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(queryByText(/Turn left/)).toBeNull();
      });
    });

    it('does NOT render NavigationSteps when directions are inactive', async () => {
      const { queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(queryByText(/Turn left/)).toBeNull();
      });
    });

    it('calls nextStep when next-step button is pressed in NavigationSteps', async () => {
      mockDirectionsHook.mockReturnValue(activeDirectionsWithSteps);
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText(/Turn left/)).toBeTruthy());
      // NavigationSteps renders a '›' next button
      fireEvent.press(getByText('›'));
      await waitFor(() => expect(mockNextStep).toHaveBeenCalled());
    });

    it('calls endDirections when end-navigation button is pressed in NavigationSteps', async () => {
      mockDirectionsHook.mockReturnValue(activeDirectionsWithSteps);
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText(/Turn left/)).toBeTruthy());
      fireEvent.press(getByText('End'));
      await waitFor(() => expect(mockEndDirections).toHaveBeenCalled());
    });
  });

  // --- startDirectionsToBuilding from BuildingModal ---
  describe('BuildingModal Get Directions', () => {
    it('calls startDirectionsToBuilding when Get Directions is pressed from BuildingModal', async () => {
      const { getAllByTestId, getByText } = await renderWithTheme(<Index />);
      const polygons = await waitFor(() => getAllByTestId('polygon'));
      fireEvent.press(polygons[0]);
      await waitFor(() => expect(getByText('Get Directions')).toBeTruthy());
      fireEvent.press(getByText('Get Directions'));
      await waitFor(() => expect(mockStartDirectionsToBuilding).toHaveBeenCalled());
    });
  });

  // --- Transport mode & shuttle props passed through SearchBar ---
  describe('SearchBar prop wiring', () => {
    it('passes transportMode from directionsState to SearchBar', async () => {
      const transitDirections = {
        ...defaultDirections,
        state: { ...defaultDirections.state, transportMode: 'TRANSIT' as const },
      };
      mockDirectionsHook.mockReturnValue(transitDirections);
      await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(mockSearchBarProperties.transportMode).toBe('TRANSIT');
      });
    });

    it('passes setTransportMode as onChangeTransportMode to SearchBar', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(mockSearchBarProperties.onChangeTransportMode).toBe(mockSetTransportMode);
      });
    });

    it('passes useShuttle=false to SearchBar by default', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(mockSearchBarProperties.useShuttle).toBe(false);
      });
    });

    it('updates useShuttle prop on SearchBar when toggled via onUseShuttleChange', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onUseShuttleChange).toBeDefined());

      act(() => { mockSearchBarProperties.onUseShuttleChange(true); });

      await waitFor(() => {
        expect(mockSearchBarProperties.useShuttle).toBe(true);
      });
    });

    it('passes previewRouteInfo to SearchBar', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(mockSearchBarProperties.previewRouteInfo).toBeDefined();
      });
    });
  });

  // --- handleStartRoute edge case: no location ---
  describe('handleStartRoute edge cases', () => {
    it('does not call startDirections when location is null and start route is triggered', async () => {
      mockWatchLocation.mockReturnValue(noLocationWatch);
      mockPermissionState.mockReturnValue(deniedPermission);

      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      mockSearchBarProperties.onStartRoute();

      expect(mockStartDirections).not.toHaveBeenCalled();
    });

    it('does not call previewDirections when destination is null', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onPreviewRoute).toBeDefined());

      // No destination set — call preview anyway
      mockSearchBarProperties.onPreviewRoute();

      expect(mockPreviewDirections).not.toHaveBeenCalled();
    });

    it('does not call previewDirections when start is null', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onPreviewRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      // start is still null
      mockSearchBarProperties.onPreviewRoute();

      expect(mockPreviewDirections).not.toHaveBeenCalled();
    });
  });

  // --- Shuttle bus stop markers ---
  describe('Shuttle bus stop markers', () => {
    it('renders bus stop markers on the map', async () => {
      const { getAllByTestId } = await renderWithTheme(<Index />);
      const markers = await waitFor(() => getAllByTestId('marker'));
      // At least the two shuttle stop markers should be present (may include label markers)
      expect(markers.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Shuttle button & ShuttleScheduleModal ---
  describe('shuttle button', () => {
    it('renders the shuttle 🚌 button', async () => {
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => {
        expect(getByText('🚌')).toBeTruthy();
      });
    });

    it('opens ShuttleScheduleModal when shuttle button is pressed', async () => {
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('🚌')).toBeTruthy());

      fireEvent.press(getByText('🚌'));

      await waitFor(() => {
        expect(getByText('🚌 Shuttle Schedule')).toBeTruthy();
      });
    });

    it('closes ShuttleScheduleModal when its close button is pressed', async () => {
      const { getByText, queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('🚌')).toBeTruthy());

      fireEvent.press(getByText('🚌'));
      await waitFor(() => expect(getByText('🚌 Shuttle Schedule')).toBeTruthy());

      fireEvent.press(getByText('×'));
      await waitFor(() => {
        expect(queryByText('🚌 Shuttle Schedule')).toBeNull();
      });
    });

    it('ShuttleScheduleModal is not visible on initial render', async () => {
      const { queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(queryByText('map-view')).toBeNull());
      expect(queryByText('🚌 Shuttle Schedule')).toBeNull();
    });

    it('shows bus stop info inside the modal when opened', async () => {
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('🚌')).toBeTruthy());

      fireEvent.press(getByText('🚌'));

      await waitFor(() => {
        expect(getByText('Bus Stops')).toBeTruthy();
        expect(getByText('Loyola Chapel')).toBeTruthy();
        expect(getByText('Henry F. Hall Building')).toBeTruthy();
      });
    });

    it('shows "Show Shuttle Route on Map" button inside the modal', async () => {
      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('🚌')).toBeTruthy());

      fireEvent.press(getByText('🚌'));

      await waitFor(() => {
        expect(getByText('🗺️ Show Shuttle Route on Map')).toBeTruthy();
      });
    });

    it('starts shuttle route directions and closes modal when "Show Shuttle Route on Map" is pressed', async () => {
      const { getByText, queryByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('🚌')).toBeTruthy());

      fireEvent.press(getByText('🚌'));
      await waitFor(() => expect(getByText('🗺️ Show Shuttle Route on Map')).toBeTruthy());

      fireEvent.press(getByText('🗺️ Show Shuttle Route on Map'));

      expect(mockStartDirections).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) }),
        expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) })
      );
      await waitFor(() => {
        expect(queryByText('🚌 Shuttle Schedule')).toBeNull();
      });
    });
  });

  // --- Same Building Alert ---
  it('shows an alert and blocks routing when start and destination are the same building', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => { });

    await renderWithTheme(<Index />);
    await waitFor(() => expect(mockSearchBarProperties.onPreviewRoute).toBeDefined());

    const sameBuilding = {
      id: 'H',
      name: 'Hall Building',
      coordinate: { latitude: 45.497, longitude: -73.579 }
    };

    await act(async () => {
      mockSearchBarProperties.onChangeStart(sameBuilding);
      mockSearchBarProperties.onChangeDestination(sameBuilding);
    });

    await act(async () => {
      mockSearchBarProperties.onPreviewRoute();
    });

    expect(alertSpy).toHaveBeenCalledWith("Start and destination cannot be the same building.");

    expect(mockPreviewDirections).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  // --- Directions From/To via BuildingModal ---
  describe('handleDirectionsFrom / handleDirectionsTo', () => {
    it('sets start choice when Get Directions From is pressed in modal', async () => {
      const { getAllByTestId, getByTestId } = await renderWithTheme(<Index />);
      const polygons = await waitFor(() => getAllByTestId('polygon'));

      // Open the modal by pressing a polygon
      fireEvent.press(polygons[0]);

      // Press "Get Directions From"
      await waitFor(() => expect(getByTestId('directions-from-button')).toBeTruthy());
      fireEvent.press(getByTestId('directions-from-button'));

      // The building should now be set as the start choice in SearchBar
      await waitFor(() => {
        expect(mockSearchBarProperties.start).toBeTruthy();
        expect(mockSearchBarProperties.start.name).toBeTruthy();
        expect(mockSearchBarProperties.start.coordinate).toBeTruthy();
        expect(mockSearchBarProperties.start.coordinate.latitude).toBeDefined();
        expect(mockSearchBarProperties.start.coordinate.longitude).toBeDefined();
      });
    });

    it('sets destination choice when Get Directions To is pressed in modal', async () => {
      const { getAllByTestId, getByTestId } = await renderWithTheme(<Index />);
      const polygons = await waitFor(() => getAllByTestId('polygon'));

      // Open the modal by pressing a polygon
      fireEvent.press(polygons[0]);

      // Press "Get Directions To"
      await waitFor(() => expect(getByTestId('directions-to-button')).toBeTruthy());
      fireEvent.press(getByTestId('directions-to-button'));

      // The building should now be set as the destination choice in SearchBar
      await waitFor(() => {
        expect(mockSearchBarProperties.destination).toBeTruthy();
        expect(mockSearchBarProperties.destination.name).toBeTruthy();
        expect(mockSearchBarProperties.destination.coordinate).toBeTruthy();
        expect(mockSearchBarProperties.destination.coordinate.latitude).toBeDefined();
        expect(mockSearchBarProperties.destination.coordinate.longitude).toBeDefined();
      });
    });
  });
});
