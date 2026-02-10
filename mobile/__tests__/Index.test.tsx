import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../app/(tabs)/index';
import { ThemeProvider } from '../context/ThemeContext';
import { fireEvent, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 45.4972,
        longitude: -73.5790,
      },
      timestamp: Date.now(),
    })
  ),
  Accuracy: {
    Balanced: 3,
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      googleMapsApiKey: 'test-api-key',
    },
  },
}));

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map-directions" {...props} />,
  };
});

let mockPolygonRenderCount = 0;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
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

function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider>{component}</ThemeProvider>);
}

describe('<Index />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPolygonRenderCount = 0;
  });

  it('renders MapView component', async () => {
    const { getByTestId } = renderWithTheme(<Index />);

    await waitFor(() => {
      const mapView = getByTestId('map-view');
      expect(mapView).toBeTruthy();
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

  it('opens BuildingModal', async () => {
    const { getAllByTestId, getByText } = renderWithTheme(<Index />);

    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);

    await waitFor(() => {
      expect(getByText('Get Directions')).toBeTruthy();
    });

    expect(screen.getByText(/Get Directions/i)).toBeTruthy();
  });

  it('closes BuildingModal', async () => {
    const { getAllByTestId, getByText, queryByText } = renderWithTheme(<Index />);

    const polygons = await waitFor(() => getAllByTestId('polygon'));
    fireEvent.press(polygons[0]);

    const closeButton = getByText('X');
    fireEvent.press(closeButton);

    await waitFor(() => {
      expect(queryByText('Get Directions')).toBeNull();
    });
  });
});
