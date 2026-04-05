import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import Index from '../app/(tabs)/index';
import { ThemeProvider } from '../context/ThemeContext';


jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ data: { user: { id: '1', name: 'Test', email: 'test@test.com', photo: null }, idToken: 'id-token' } })),
    signOut: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve({ accessToken: 'access-token', idToken: 'id-token' })),
    getCurrentUser: jest.fn(() => null),
  },
  GoogleSigninButton: Object.assign(
    () => null,
    { Size: { Wide: 1 }, Color: { Dark: 1 } }
  ),
  isSuccessResponse: jest.fn(() => true),
  isErrorWithCode: jest.fn(() => false),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require('react');
    useEffect(() => { cb(); }, []);
  },
  useLocalSearchParams: () => mockLocalSearchParams,
}));

jest.mock('../utils/devConfig', () => ({
  DEV_OVERRIDE_LOCATION: null,
  DEV_OVERRIDE_TIME: null,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockNextClassData = {
  title: 'COMP 345',
  buildingCode: 'H',
  buildingName: 'Hall Building',
  room: '820',
  startTime: new Date(),
  endTime: new Date(),
  walkingMinutes: 5,
};

jest.mock('../hooks/useNextClass', () => ({
  useNextClass: jest.fn(() => ({ 
    nextClass: mockNextClassData, 
    status: 'found', 
    isLoading: false 
  })),
  NO_CLASS_BEHAVIOR: 'show_message',
}));

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
const mockCalculateCombinedRoute = jest.fn();
const mockClearCombinedRoute = jest.fn();
const mockCombinedNavigationHook = jest.fn();

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

jest.mock('../hooks/useCombinedNavigation', () => ({
  useCombinedNavigation: () => mockCombinedNavigationHook(),
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

  const MockCircle = (props: any) => <View testID="circle" {...props} />;

  return {
    __esModule: true,
    default: MockMapView,
    Polygon: MockPolygon,
    Marker: MockMarker,
    Circle: MockCircle,
  };
});


const mockSearchPoisForMap = jest.fn();
jest.mock('../utils/poiMapSearch', () => ({
  searchPoisForMap: (...args: any[]) => mockSearchPoisForMap(...args),
}));

const mockResolvePoiDetails = jest.fn();
jest.mock('../utils/poiFetch', () => ({
  ...jest.requireActual('../utils/poiFetch'),
  resolvePoiDetails: (...args: any[]) => mockResolvePoiDetails(...args),
}));

// --- Test Starting and Ending Directions ---
let mockSearchBarProperties: any = {};
let mockBuildingModalProperties: any = {};
let mockPoiModalProperties: any = {};
let mockIndoorMapModalProperties: any = {};
let mockLocalSearchParams: Record<string, string | undefined> = {};

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

jest.mock('../components/buildingModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      if (props.mode === 'poi') {
        mockPoiModalProperties = props;
      } else {
        mockBuildingModalProperties = props;
      }
      if (!props.visible) return null;
      if (props.mode === 'poi') {
        return (
          <View testID="poi-modal">
            <TouchableOpacity testID="poi-modal-close" onPress={props.onClose}>
              <Text>Close POI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="poi-modal-directions"
              onPress={() => props.onGetDirections?.(props.building)}
            >
              <Text>Get POI Directions</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View testID="building-modal">
          <TouchableOpacity testID="close-button" onPress={props.onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="directions-from-button"
            onPress={() => {
              props.onDirectionsFrom(props.building);
              props.onClose();
            }}
          >
            <Text>Get Directions From</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="directions-to-button"
            onPress={() => {
              props.onDirectionsTo(props.building);
              props.onClose();
            }}
          >
            <Text>Get Directions To</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

jest.mock('../components/indoorMapModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      mockIndoorMapModalProperties = props;
      if (!props.visible) return null;
      return (
        <View testID="indoor-map-modal">
          <Text testID="indoor-map-building-code">{props.initialBuildingCode}</Text>
          <TouchableOpacity testID="indoor-map-close" onPress={props.onClose}>
            <Text>Close Indoor Map</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});



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

const defaultCombinedNavigation = {
  fullRoute: [],
  calculateRoute: mockCalculateCombinedRoute,
  clearRoute: mockClearCombinedRoute,
  isCalculating: false,
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
  mockCombinedNavigationHook.mockReturnValue(defaultCombinedNavigation);
  mockCalculateCombinedRoute.mockResolvedValue([]);
}

async function renderWithTheme(component: React.ReactElement) {
  const result = render(<ThemeProvider>{component}</ThemeProvider>);
  await act(async () => { });
  return result;
}

describe('<Index />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchBarProperties = {};
    mockBuildingModalProperties = {};
    mockPoiModalProperties = {};
    mockIndoorMapModalProperties = {};
    mockLocalSearchParams = {};
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
      expect(queryByText('Get Directions To')).toBeFalsy();
    }, { timeout: 3000 });
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

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      expect(mockStartDirections).toHaveBeenCalledWith(
        { latitude: 45.4972, longitude: -73.579 },
        { latitude: 45.497, longitude: -73.579 }
      );
    });

    it('opens IndoorMapModal with endNodeId when start is same building as indoor POI and no start room', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H_F1_room_18',
          name: 'Elevator',
          code: 'H',
          room: 'H_F1_room_18',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBe(true);
        expect(mockIndoorMapModalProperties.initialBuildingCode).toBe('H');
        expect(mockIndoorMapModalProperties.presetRoute).toEqual({ endNodeId: 'H_F1_room_18' });
      });

      expect(mockStartDirections).not.toHaveBeenCalled();
      expect(mockCalculateCombinedRoute).not.toHaveBeenCalled();
    });

    it('opens IndoorMapModal when start is "current-location" and userBuilding matches POI building', async () => {
      // Start with no building so startChoice auto-sets to "current-location" (avoids getInteriorPoint crash).
      // Then swap the mock before setting the destination so handleStartRoute sees userBuilding.code = 'H'.
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      // startChoice is now { id: "current-location", ... } — switch userBuilding to H
      mockUserBuilding.mockReturnValue({ code: 'H', name: 'Henry F. Hall Building' });

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H_F1_room_18',
          name: 'Elevator',
          code: 'H',
          room: 'H_F1_room_18',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBe(true);
        expect(mockIndoorMapModalProperties.presetRoute).toEqual({ endNodeId: 'H_F1_room_18' });
      });
    });

    it('does NOT open IndoorMapModal when user is outside and POI building does not match', async () => {
      // userBuilding = null (outside), startChoice stays null → effectiveBuildingCode = undefined ≠ 'H'
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H_F1_room_18',
          name: 'Elevator',
          code: 'H',
          room: 'H_F1_room_18',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBeFalsy();
      });
    });

    it('falls through to combined flow (does NOT open IndoorMapModal) when start room is set', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '920',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H_F1_room_18',
          name: 'Elevator',
          code: 'H',
          room: 'H_F1_room_18',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      // Combined flow is invoked instead
      await waitFor(() => {
        expect(mockCalculateCombinedRoute).toHaveBeenCalled();
      });
      expect(mockIndoorMapModalProperties.visible).toBeFalsy();
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

  describe('exit preview button', () => {
    it('renders exit-preview.button when previewActive is true and calls endDirections on press', async () => {
      const previewDirectionsState = {
        ...defaultDirections,
        state: {
          ...defaultDirections.state,
          origin: { latitude: 45.497, longitude: -73.579 },
          isActive: false,
        },
      };
      mockDirectionsHook.mockReturnValue(previewDirectionsState);

      const { getByTestId } = await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(getByTestId('exit-preview.button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('exit-preview.button'));
      expect(mockEndDirections).toHaveBeenCalled();
    });

    it('does not render exit-preview.button when not in preview state', async () => {
      const { queryByTestId } = await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onPreviewRoute).toBeDefined());
      expect(queryByTestId('exit-preview.button')).toBeNull();
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
      expect(mockClearCombinedRoute).toHaveBeenCalled();

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

  // --- MapViewDirections onError callbacks ---
  describe('MapViewDirections onError', () => {
    it('logs error for active non-shuttle route', async () => {
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

    it('logs errors for active shuttle leg onError callbacks', async () => {
      mockMapDirectionsBehavior = 'error';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // 1. Start with inactive directions so SearchBar is visible
      mockDirectionsHook.mockReturnValue(defaultDirections);
      const { rerender } = await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onUseShuttleChange).toBeDefined());

      // 2. Enable shuttle while SearchBar is still rendered
      await act(async () => {
        mockSearchBarProperties.onUseShuttleChange(true);
      });

      // 3. Now switch the mock to active directions and re-render
      mockDirectionsHook.mockReturnValue(activeDirections);
      await act(async () => {
        rerender(<ThemeProvider><Index /></ThemeProvider>);
      });

      // All 3 shuttle leg onError callbacks should fire
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Index] MapViewDirections leg1 ERROR:', 'Route not found'
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Index] MapViewDirections leg2 ERROR:', 'Route not found'
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Index] MapViewDirections leg3 ERROR:', 'Route not found'
        );
      });
      consoleSpy.mockRestore();
    });
  });

  // --- Preview route with shuttle and fallback origin ---
  describe('Preview shuttle route with location fallback', () => {
    it('renders preview shuttle legs using location when no start choice is set', async () => {
      mockMapDirectionsBehavior = 'ready';

      // Use default (no active directions) so the preview path is taken
      // Set up directions hook in preview mode with shuttle-compatible state
      const previewDirectionsState = {
        ...defaultDirections,
        state: {
          ...defaultDirections.state,
          origin: null,
          destination: null,
        },
      };
      mockDirectionsHook.mockReturnValue(previewDirectionsState);

      await renderWithTheme(<Index />);

      // Set a destination via SearchBar (no start → falls back to location)
      await waitFor(() => expect(mockSearchBarProperties.onChangeDestination).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'LOY',
          name: 'Loyola Building',
          coordinate: { latitude: 45.458, longitude: -73.639 },
        });
      });

      // Enable shuttle
      await act(async () => {
        mockSearchBarProperties.onUseShuttleChange(true);
      });

      // The preview shuttle legs should render using location as origin fallback
      await waitFor(() => {
        expect(mockSearchBarProperties.useShuttle).toBe(true);
        expect(mockSearchBarProperties.destination).toBeTruthy();
      });
    });
  });

  // --- Route line visual styles per transport mode ---
  describe('Route line styles per transport mode', () => {
    const ROUTE_LINE_STYLES = require('../constants/routeStyles').ROUTE_LINE_STYLES;

    function makeActiveDirectionsWithMode(mode: string) {
      return {
        ...activeDirections,
        state: {
          ...activeDirections.state,
          transportMode: mode as any,
        },
      };
    }

    it('applies DRIVING style (solid blue) to the route line', async () => {
      mockDirectionsHook.mockReturnValue(makeActiveDirectionsWithMode('DRIVING'));
      const { getAllByTestId } = await renderWithTheme(<Index />);
      const directions = await waitFor(() => getAllByTestId('map-directions'));
      const routeLine = directions[0];
      expect(routeLine.props.strokeColor).toBe(ROUTE_LINE_STYLES.DRIVING.strokeColor);
      expect(routeLine.props.strokeWidth).toBe(ROUTE_LINE_STYLES.DRIVING.strokeWidth);
      expect(routeLine.props.lineDashPattern).toBeUndefined();
    });

    it('applies WALKING style (dotted green) to the route line', async () => {
      mockDirectionsHook.mockReturnValue(makeActiveDirectionsWithMode('WALKING'));
      const { getAllByTestId } = await renderWithTheme(<Index />);
      const directions = await waitFor(() => getAllByTestId('map-directions'));
      const routeLine = directions[0];
      expect(routeLine.props.strokeColor).toBe(ROUTE_LINE_STYLES.WALKING.strokeColor);
      expect(routeLine.props.strokeWidth).toBe(ROUTE_LINE_STYLES.WALKING.strokeWidth);
      expect(routeLine.props.lineDashPattern).toEqual(ROUTE_LINE_STYLES.WALKING.lineDashPattern);
    });

    it('applies BICYCLING style (dashed orange) to the route line', async () => {
      mockDirectionsHook.mockReturnValue(makeActiveDirectionsWithMode('BICYCLING'));
      const { getAllByTestId } = await renderWithTheme(<Index />);
      const directions = await waitFor(() => getAllByTestId('map-directions'));
      const routeLine = directions[0];
      expect(routeLine.props.strokeColor).toBe(ROUTE_LINE_STYLES.BICYCLING.strokeColor);
      expect(routeLine.props.strokeWidth).toBe(ROUTE_LINE_STYLES.BICYCLING.strokeWidth);
      expect(routeLine.props.lineDashPattern).toEqual(ROUTE_LINE_STYLES.BICYCLING.lineDashPattern);
    });

    it('applies TRANSIT style (solid purple) to the route line', async () => {
      mockDirectionsHook.mockReturnValue(makeActiveDirectionsWithMode('TRANSIT'));
      const { getAllByTestId } = await renderWithTheme(<Index />);
      const directions = await waitFor(() => getAllByTestId('map-directions'));
      const routeLine = directions[0];
      expect(routeLine.props.strokeColor).toBe(ROUTE_LINE_STYLES.TRANSIT.strokeColor);
      expect(routeLine.props.strokeWidth).toBe(ROUTE_LINE_STYLES.TRANSIT.strokeWidth);
      expect(routeLine.props.lineDashPattern).toBeUndefined();
    });
  });

  describe('Indoor map entry points', () => {
    it('opens IndoorMapModal when Indoor quick-access button is pressed', async () => {
      const { getByText, getByTestId } = await renderWithTheme(<Index />);

      fireEvent.press(getByText('Indoor'));

      await waitFor(() => {
        expect(getByTestId('indoor-map-modal')).toBeTruthy();
        expect(mockIndoorMapModalProperties.visible).toBe(true);
        expect(mockIndoorMapModalProperties.initialBuildingCode).toBeTruthy();
      });
    });

    it('opens IndoorMapModal from SearchBar onOpenBuilding when indoor map exists', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onOpenBuilding).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onOpenBuilding({
          id: 'H',
          name: 'Hall Building (H)',
          code: 'H',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBe(true);
        expect(mockIndoorMapModalProperties.initialBuildingCode).toBe('H');
      });
    });

    it('does not open IndoorMapModal from SearchBar onOpenBuilding when no indoor map exists', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onOpenBuilding).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onOpenBuilding({
          id: 'ZZZ',
          name: 'Unknown Building (ZZZ)',
          code: 'ZZZ',
          coordinate: { latitude: 45.5, longitude: -73.6 },
          campus: 'SGW',
        });
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBeFalsy();
      });
    });

    it('closes IndoorMapModal and clears preset route when close is pressed', async () => {
      const { getByText, getByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent.press(getByText('Indoor'));
      await waitFor(() => expect(getByTestId('indoor-map-modal')).toBeTruthy());

      fireEvent.press(getByTestId('indoor-map-close'));

      await waitFor(() => {
        expect(queryByTestId('indoor-map-modal')).toBeNull();
        expect(mockIndoorMapModalProperties.visible).toBe(false);
      });
    });
  });

  describe('Nearby deep-link params handling', () => {
    it('sets nearby destination and resets route state when nearby params are valid', async () => {
      mockLocalSearchParams = {
        nearbyNonce: 'nonce-1',
        nearbyLat: '45.5001',
        nearbyLng: '-73.6001',
        nearbyName: 'Nearby Cafe',
      };

      await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(mockSearchBarProperties.destination).toEqual(
          expect.objectContaining({
            id: 'nearby-nonce-1',
            name: 'Nearby Cafe',
            coordinate: { latitude: 45.5001, longitude: -73.6001 },
          })
        );
      });

      expect(mockEndDirections).toHaveBeenCalled();
      expect(mockClearCombinedRoute).toHaveBeenCalled();
    });

    it('ignores nearby params when coordinates are invalid', async () => {
      mockLocalSearchParams = {
        nearbyNonce: 'nonce-2',
        nearbyLat: 'abc',
        nearbyLng: '-73.6001',
        nearbyName: 'Bad Coords',
      };

      await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(mockSearchBarProperties.destination).toBeNull();
      });
      expect(mockEndDirections).not.toHaveBeenCalled();
      expect(mockClearCombinedRoute).not.toHaveBeenCalled();
    });
  });

  describe('Combined routing for room destinations', () => {
    it('uses calculateRoute instead of startDirections when destination includes a room', async () => {
      await renderWithTheme(<Index />);
      await waitFor(() => expect(mockSearchBarProperties.onStartRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockCalculateCombinedRoute).toHaveBeenCalledWith(
          '',
          'H 820',
          false,
          'WALKING',
          { latitude: 45.4972, longitude: -73.579 },
          'test-api-key'
        );
      });
      expect(mockStartDirections).not.toHaveBeenCalled();
    });

    it('uses combined routing from NextClassModal when next class has a room', async () => {
      const { getByText } = await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(getByText('Get Directions')).toBeTruthy();
      });

      fireEvent.press(getByText('Get Directions'));

      await waitFor(() => {
        expect(mockCalculateCombinedRoute).toHaveBeenCalledWith(
          '',
          'H 820',
          false,
          'WALKING',
          { latitude: 45.4972, longitude: -73.579 },
          'test-api-key'
        );
      });
    });

    it('builds route raw correctly when start has room and destination has only code', async () => {
      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
        mockSearchBarProperties.onChangeDestination({
          id: 'MB',
          name: 'Molson Building',
          code: 'MB',
          coordinate: { latitude: 45.495, longitude: -73.578 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockCalculateCombinedRoute).toHaveBeenCalledWith(
          'H 820',
          'MB',
          false,
          'WALKING',
          { latitude: 45.4972, longitude: -73.579 },
          'test-api-key'
        );
      });
    });

    it('starts outdoor handoff directions when combined route contains outdoor then indoor steps', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Walk outside',
              distance: '100 m',
              source: 'outdoor',
              coordinates: { latitude: 45.51, longitude: -73.6 },
            },
            {
              instruction: 'Enter building',
              distance: '20 m',
              source: 'indoor',
              buildingCode: 'H',
              startNodeId: 'A',
              endNodeId: 'B',
              startNodeLabel: 'A',
              endNodeLabel: 'B',
              coordinates: { latitude: 45.52, longitude: -73.61 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockStartDirections).toHaveBeenCalledWith(
          { latitude: 45.51, longitude: -73.6 },
          { latitude: 45.52, longitude: -73.61 }
        );
      });
    });

    it('calls endDirections when combined route has no outdoor steps', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Indoor only',
              distance: '20 m',
              source: 'indoor',
              buildingCode: 'H',
              startNodeId: 'A',
              endNodeId: 'B',
              startNodeLabel: 'A',
              endNodeLabel: 'B',
              coordinates: { latitude: 45.52, longitude: -73.61 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockEndDirections).toHaveBeenCalled();
      });
    });

    it('opens indoor modal with preset route when active combined step is indoor', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Head to 820',
              distance: '15 m',
              source: 'indoor',
              buildingCode: 'H',
              startNodeId: 'NODE_START',
              endNodeId: 'NODE_END',
              startNodeLabel: 'Lobby',
              endNodeLabel: 'Room 820',
              coordinates: { latitude: 45.52, longitude: -73.61 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.visible).toBe(true);
        expect(mockIndoorMapModalProperties.initialBuildingCode).toBe('H');
        expect(mockIndoorMapModalProperties.presetRoute).toEqual({
          startNodeId: 'NODE_START',
          endNodeId: 'NODE_END',
          startLabel: 'Lobby',
          endLabel: 'Room 820',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onEndRoute();
      });

      await waitFor(() => {
        expect(mockIndoorMapModalProperties.presetRoute).toBeNull();
      });
    });

    it('auto-advances combined step when user is within 20m of next step', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Step One',
              distance: '10 m',
              source: 'outdoor',
              coordinates: { latitude: 45.4972, longitude: -73.579 },
            },
            {
              instruction: 'Step Two',
              distance: '10 m',
              source: 'outdoor',
              coordinates: { latitude: 45.49725, longitude: -73.579 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      const { getByText } = await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(getByText(/Step Two/)).toBeTruthy();
      });
    });

    it('jumps to next indoor leg when user is within 35m of indoor handoff', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Outdoor leg',
              distance: '100 m',
              source: 'outdoor',
              coordinates: { latitude: 45.4972, longitude: -73.579 },
            },
            {
              instruction: 'Indoor handoff',
              distance: '15 m',
              source: 'indoor',
              buildingCode: 'H',
              startNodeId: 'S',
              endNodeId: 'E',
              startNodeLabel: 'Start',
              endNodeLabel: 'End',
              coordinates: { latitude: 45.49742, longitude: -73.579 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      const { getByText } = await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(getByText(/Indoor handoff/)).toBeTruthy();
      });
    });

    it('uses combined navigation prev/next handlers instead of hook prevStep/nextStep', async () => {
      const combinedState: any = {
        fullRoute: [],
        isCalculating: false,
        clearRoute: mockClearCombinedRoute,
        calculateRoute: jest.fn(async () => {
          combinedState.fullRoute = [
            {
              instruction: 'Combined Step One',
              distance: '20 m',
              source: 'outdoor',
              coordinates: { latitude: 45.4972, longitude: -73.579 },
            },
            {
              instruction: 'Combined Step Two',
              distance: '30 m',
              source: 'outdoor',
              coordinates: { latitude: 45.498, longitude: -73.58 },
            },
          ];
          return combinedState.fullRoute;
        }),
      };
      mockCombinedNavigationHook.mockImplementation(() => combinedState);

      const { getByText, queryByText } = await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          code: 'H',
          room: '820',
          coordinate: { latitude: 45.497, longitude: -73.579 },
          campus: 'SGW',
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => expect(getByText('Combined Step One')).toBeTruthy());

      // At index 0, prev should no-op in combined branch.
      fireEvent.press(getByText('‹'));
      expect(getByText('Combined Step One')).toBeTruthy();

      fireEvent.press(getByText('›'));
      await waitFor(() => expect(getByText('Combined Step Two')).toBeTruthy());

      // At last index, next should no-op in combined branch.
      fireEvent.press(getByText('›'));
      expect(getByText('Combined Step Two')).toBeTruthy();

      fireEvent.press(getByText('‹'));
      await waitFor(() => expect(getByText('Combined Step One')).toBeTruthy());

      expect(mockNextStep).not.toHaveBeenCalled();
      expect(mockPrevStep).not.toHaveBeenCalled();
    });
  });

  describe('effective location and next-class non-room flow', () => {
    it('uses DEV_OVERRIDE_LOCATION coordinates as effective origin when set', async () => {
      // DEV_OVERRIDE_LOCATION now feeds into useWatchLocation's initial state,
      // so simulate it by making the mock return the override coords.
      const overrideLocation = {
        coords: { latitude: 46.0, longitude: -74.0, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      };
      mockWatchLocation.mockReturnValue({ location: overrideLocation, loading: false, error: null });

      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await act(async () => {
        mockSearchBarProperties.onStartRoute();
      });

      await waitFor(() => {
        expect(mockStartDirections).toHaveBeenCalledWith(
          { latitude: 46.0, longitude: -74.0 },
          { latitude: 45.497, longitude: -73.579 }
        );
      });
    });

    it('for next class without room, uses building coordinate and starts directions', async () => {
      mockNextClassData.room = undefined as any;
      mockNextClassData.buildingCode = 'H';

      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('Get Directions')).toBeTruthy());

      fireEvent.press(getByText('Get Directions'));

      await waitFor(() => {
        expect(mockStartDirections).toHaveBeenCalledWith(
          { latitude: 45.4972, longitude: -73.579 },
          expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) })
        );
      });
    });

    it('for next class without room and unknown building, shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => { });
      mockNextClassData.room = undefined as any;
      mockNextClassData.buildingCode = 'UNKNOWN_BUILDING';

      const { getByText } = await renderWithTheme(<Index />);
      await waitFor(() => expect(getByText('Get Directions')).toBeTruthy());

      fireEvent.press(getByText('Get Directions'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Could not find coordinates for this building.');
      });

      alertSpy.mockRestore();
    });
  });

  describe('search options payloads', () => {
    it('passes computed roomOptionsByBuilding to SearchBar', async () => {
      await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(mockSearchBarProperties.roomOptionsByBuilding).toBeDefined();
        expect(Object.keys(mockSearchBarProperties.roomOptionsByBuilding).length).toBeGreaterThan(0);
      });
    });
  });

  describe('POI category search', () => {
    const mockPois = [
      {
        id: 'poi-1',
        name: 'Cafe Alpha',
        address: '123 Coffee St',
        distance: 100,
        isOpen: true,
        latitude: 45.498,
        longitude: -73.578,
        source: 'google' as const,
        categoryLabel: 'Coffee Shops',
      },
      {
        id: 'poi-2',
        name: 'Cafe Beta',
        address: '456 Java Ave',
        distance: 200,
        isOpen: false,
        latitude: 45.499,
        longitude: -73.577,
        source: 'google' as const,
        categoryLabel: 'Coffee Shops',
      },
    ];

    it('passes onPoiCategorySearch and onSearchBarOpen to SearchBar', async () => {
      await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(typeof mockSearchBarProperties.onPoiCategorySearch).toBe('function');
        expect(typeof mockSearchBarProperties.onSearchBarOpen).toBe('function');
      });
    });

    it('shows alert when location is not available', async () => {
      mockWatchLocation.mockReturnValue(noLocationWatch);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Location Required',
        'Please enable location services to search for nearby POIs.'
      );
      alertSpy.mockRestore();
    });

    it('calls searchPoisForMap and sets markers on success', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: mockPois, error: null });

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(mockSearchPoisForMap).toHaveBeenCalledWith(
        'coffee',
        { latitude: 45.4972, longitude: -73.579 },
        'test-api-key'
      );
    });

    it('animates map to region on successful POI search', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: mockPois, error: null });

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 45.4972,
          longitude: -73.579,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }),
        500
      );
    });

    it('uses start building coordinate as search center when a non-current-location start is set', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: mockPois, error: null });

      await renderWithTheme(<Index />);

      await act(async () => {
        mockSearchBarProperties.onChangeStart({
          id: 'VA',
          name: 'VA Building',
          coordinate: { latitude: 45.459, longitude: -73.638 },
        });
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('restaurant');
      });

      expect(mockSearchPoisForMap).toHaveBeenCalledWith(
        'restaurant',
        { latitude: 45.459, longitude: -73.638 },
        'test-api-key'
      );
    });

    it('shows error alert when searchPoisForMap returns an error', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: [], error: 'API failure' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Search Error',
        'Could not load Coffee Shops: API failure'
      );
      alertSpy.mockRestore();
    });

    it('shows no results alert when searchPoisForMap returns empty array', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: [], error: null });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('grocery');
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'No Results',
        'No grocery stores found nearby.'
      );
      alertSpy.mockRestore();
    });

    it('clears POI markers when onSearchBarOpen is called', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: mockPois, error: null });

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      await act(async () => {
        mockSearchBarProperties.onSearchBarOpen();
      });

      // After clearing, a new search should start fresh
      mockSearchPoisForMap.mockResolvedValue({ pois: [mockPois[0]], error: null });
      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(mockSearchPoisForMap).toHaveBeenCalledTimes(2);
    });

    it('clears POI state when handleEndDirections is called', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: mockPois, error: null });

      await renderWithTheme(<Index />);

      await waitFor(() => expect(mockSearchBarProperties.onPoiCategorySearch).toBeDefined());

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      // Activate directions so onEndRoute becomes available
      mockDirectionsHook.mockReturnValue(activeDirections);
      await act(async () => {});

      await waitFor(() => expect(mockSearchBarProperties.onEndRoute).toBeDefined());

      await act(async () => {
        mockSearchBarProperties.onEndRoute();
      });

      expect(mockEndDirections).toHaveBeenCalled();
    });
  });

  describe('POI marker press and modal', () => {
    const mockGooglePoi = {
      id: 'place-abc',
      name: 'Great Coffee',
      address: '789 Brew Lane',
      distance: 150,
      isOpen: true,
      latitude: 45.498,
      longitude: -73.578,
      source: 'google' as const,
      categoryLabel: 'Coffee Shops',
    };

    const mockStudyPoi = {
      id: 'study-lb',
      name: 'J. W. McConnell Library Building',
      address: '1400 De Maisonneuve Blvd W',
      distance: 100,
      isOpen: true,
      latitude: 45.497,
      longitude: -73.579,
      source: 'study' as const,
      categoryLabel: 'Study Spaces',
      pricing: 'Free',
    };

    beforeEach(() => {
      mockSearchPoisForMap.mockResolvedValue({ pois: [mockGooglePoi], error: null });
      mockResolvePoiDetails.mockResolvedValue({
        details: {
          ...mockGooglePoi,
          phoneNumber: '514-555-0000',
          pricing: '$$',
          website: 'https://example.com',
        },
        error: null,
      });
    });

    it('passes onPoiCategorySearch callback to SearchBar', async () => {
      await renderWithTheme(<Index />);

      await waitFor(() => {
        expect(mockSearchBarProperties.onPoiCategorySearch).toBeDefined();
      });
    });

    it('renders POI markers after successful search', async () => {
      const { getByTestId, queryAllByTestId } = await renderWithTheme(<Index />);

      // Zoom out to hide building label markers; after zoom out only POI markers have testID="marker"
      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await waitFor(() => {
        expect(queryAllByTestId('marker').length).toBe(0);
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(queryAllByTestId('marker').length).toBe(1);
    });

    it('opens POI modal when a POI marker is pressed', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      // Zoom out to hide building label markers
      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      // Find and press the POI marker (bus stops = 2, POI = 1 at index 2)
      const markers = getAllByTestId('marker');
      const poiMarker = markers[markers.length - 1];
      await act(async () => {
        fireEvent.press(poiMarker);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
      });

      expect(mockResolvePoiDetails).toHaveBeenCalledWith(
        mockGooglePoi,
        'test-api-key'
      );
    });

    it('closes POI modal when close button is pressed', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('poi-modal-close'));
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeNull();
      });
    });

    it('sets destination when get directions is pressed from POI modal', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('poi-modal-directions'));
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeNull();
        expect(mockSearchBarProperties.destination).toBeTruthy();
        expect(mockSearchBarProperties.destination.name).toBe('Great Coffee');
      });
    });

    it('handles get directions with no coordinates gracefully', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
      });

      // Call onGetDirections with a building that has no coordinates
      await act(async () => {
        mockPoiModalProperties.onGetDirections({
          id: 'no-coords',
          geometry: { coordinates: [] },
          properties: { name: 'No Coords POI' },
        });
      });

      // Should not crash, modal should close anyway
      expect(mockSearchBarProperties.destination).toBeFalsy();
    });

    it('resolves study POI details without Google API call', async () => {
      mockSearchPoisForMap.mockResolvedValue({ pois: [mockStudyPoi], error: null });
      mockResolvePoiDetails.mockResolvedValue({
        details: { ...mockStudyPoi, pricing: 'Free' },
        error: null,
      });

      await renderWithTheme(<Index />);

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('study');
      });

      expect(mockSearchPoisForMap).toHaveBeenCalledWith(
        'study',
        expect.any(Object),
        'test-api-key'
      );
    });

    it('handles resolvePoiDetails error and sets error state', async () => {
      mockResolvePoiDetails.mockResolvedValue({
        details: null,
        error: 'Details not available',
      });

      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
        expect(mockPoiModalProperties.building?.properties?.detailsError).toBe('Details not available');
      });
    });

    it('clears POI markers when a destination is set', async () => {
      const { getByTestId, queryAllByTestId } = await renderWithTheme(<Index />);

      // Zoom out to hide building label markers; after zoom out only POI markers have testID="marker"
      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await waitFor(() => {
        expect(queryAllByTestId('marker').length).toBe(0);
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      expect(queryAllByTestId('marker').length).toBe(1);

      await act(async () => {
        mockSearchBarProperties.onChangeDestination({
          id: 'H',
          name: 'Hall Building',
          coordinate: { latitude: 45.497, longitude: -73.579 },
        });
      });

      await waitFor(() => {
        expect(queryAllByTestId('marker').length).toBe(0);
      });
    });

    it('sets isPoiDetailsLoading for google source POIs', async () => {
      // Delay the resolve to check loading state
      mockResolvePoiDetails.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            details: { ...mockGooglePoi, pricing: '$$' },
            error: null,
          }), 100)
        )
      );

      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      // Modal should be visible with loading state
      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
        expect(mockPoiModalProperties.building?.properties?.detailsLoading).toBe(true);
      });

      // Wait for details to resolve
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });

      await waitFor(() => {
        expect(mockPoiModalProperties.building?.properties?.detailsLoading).toBe(false);
      });
    });

    it('builds selectedPoiAsBuildingData correctly from POI details', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } = await renderWithTheme(<Index />);

      fireEvent(getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 45.497, longitude: -73.579,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });

      await act(async () => {
        await mockSearchBarProperties.onPoiCategorySearch('coffee');
      });

      const markers = getAllByTestId('marker');
      await act(async () => {
        fireEvent.press(markers[markers.length - 1]);
      });

      await waitFor(() => {
        expect(queryByTestId('poi-modal')).toBeTruthy();
      });

      const building = mockPoiModalProperties.building;
      expect(building).toBeTruthy();
      expect(building.id).toBe('place-abc');
      expect(building.properties.name).toBe('Great Coffee');
      expect(building.properties.address).toBe('789 Brew Lane');
      expect(building.properties.pricing).toBe('$$');
      expect(building.properties.phoneNumber).toBe('514-555-0000');
      expect(building.properties.website).toBe('https://example.com');
      expect(building.properties.categoryLabel).toBe('Coffee Shops');
      expect(building.properties.isOpen).toBe(true);
      expect(building.geometry.type).toBe('Point');
      expect(building.geometry.coordinates[0][0]).toEqual([-73.578, 45.498]);
    });
  });
});
