import React from 'react';
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
  return{
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
    routeInfo: { distance: null, duration: null },
  },
  apiKey: 'test-api-key',
  startDirections: mockStartDirections,
  startDirectionsToBuilding: mockStartDirectionsToBuilding,
  endDirections: mockEndDirections,
  clearDirections: jest.fn(),
  onRouteReady: mockOnRouteReady,
};

const activeDirections = {
  ...defaultDirections,
  state: {
    origin: { latitude: 45.497, longitude: -73.579 },
    destination: { latitude: 45.458, longitude: -73.639 },
    isActive: true,
    loading: false, error: null,
    routeInfo: { distance: null, duration: null },
  },
};

function setupDefaults() {
  //Remove this it was just for testing
  const defaultDirections = {
  state: {
    origin: null, destination: null, isActive: false,
    loading: false, error: null,
    routeInfo: { distance: null, duration: null },
  },
  apiKey: 'test-api-key',
  startDirections: mockStartDirections,
  startDirectionsToBuilding: mockStartDirectionsToBuilding,
  endDirections: mockEndDirections,
  clearDirections: jest.fn(),
  onRouteReady: mockOnRouteReady,
};

  mockPermissionState.mockReturnValue(defaultPermission);
  mockWatchLocation.mockReturnValue(defaultWatch);
  mockUserBuilding.mockReturnValue(null);
  mockDirectionsHook.mockReturnValue(defaultDirections);
}

function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider>{component}</ThemeProvider>);
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
    const { getByTestId } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  it('does not re-render building polygons on component re-render', async () => {
    const { rerender } = renderWithTheme(<Index />);
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
    const { getAllByTestId, getByText } = renderWithTheme(<Index />);
    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);
    await waitFor(() => {
      expect(getByText('Get Directions')).toBeTruthy();
    });
  });

  it('closes BuildingModal when X is pressed', async () => {
    const { getAllByTestId, getByText, queryByText } = renderWithTheme(<Index />);
    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);
    fireEvent.press(getByText('X'));
    await waitFor(() => {
      expect(queryByText('Get Directions')).toBeNull();
    });
  });

  // --- Permission denied ---
  it('shows permission required when location not granted', async () => {
    mockPermissionState.mockReturnValue(deniedPermission);
    mockWatchLocation.mockReturnValue(noLocationWatch);
    const { getByText } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('Location permission required')).toBeTruthy();
    });
  });

  // --- Location outside campus boundaries (also covers null location → undefined campus) ---
  it('shows outside campus boundaries for distant location', async () => {
    mockWatchLocation.mockReturnValue(outsideWatch);
    const { getByText } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText('Outside campus boundaries')).toBeTruthy();
    });
  });

  // --- Location on campus ---
  it('shows campus name when on campus', async () => {
    const { getByText } = renderWithTheme(<Index />);
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
    const { getByText } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByText(/Inside: Hall Building/)).toBeTruthy();
    });
  });

  // --- Region change: hide labels ---
  it('hides building labels on zoom out', async () => {
    const { getByTestId, queryAllByTestId } = renderWithTheme(<Index />);
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
    const { getByTestId, queryAllByTestId } = renderWithTheme(<Index />);
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
    const { getByText } = renderWithTheme(<Index />);
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
    const { getByTestId } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-directions')).toBeTruthy();
    });
  });

  // --- onReady callback ---
  it('calls onRouteReady and fitToCoordinates when route is ready', async () => {
    mockMapDirectionsBehavior = 'ready';
    mockDirectionsHook.mockReturnValue(activeDirections);
    renderWithTheme(<Index />);

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

    renderWithTheme(<Index />);

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
    const { getByTestId } = renderWithTheme(<Index />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  // -- Start and End Directions --
  describe('handleStartRoute', () => {

  it("Starts directions to building of choice with current location as origin", async () => {
    renderWithTheme(<Index />);
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

  it('starts route from selected start building to destination', async () => {
    renderWithTheme(<Index />);
    await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

  
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

  mockSearchBarProperties.onStartRoute();

    expect(mockStartDirections).toHaveBeenCalledWith(
      { latitude: 45.497, longitude: -73.579 }, // start building
      { latitude: 45.495, longitude: -73.578 }  // destination
    );
  });
  });

  describe('handleEndDirections', () => {
    it('calls endDirections and clears start and destination choices', async () => {
      renderWithTheme(<Index />);
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
});
