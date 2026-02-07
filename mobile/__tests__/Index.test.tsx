import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

let mockPolygonRenderCount = 0;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));
    return (
      <View testID="map-view" {...props}>
        {props.children}
      </View>
    );
  });

  const MockMarker = (props: any) => (
    <View testID={`marker-${props.title}`} {...props} />
  );

  const MockPolygon = (props: any) => {
    mockPolygonRenderCount++;
    return <View testID="polygon" {...props} />;
  };

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
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

  it('renders SGW Campus marker', async () => {
    const { getByTestId } = renderWithTheme(<Index />);

    await waitFor(() => {
      const marker = getByTestId('marker-SGW Campus');
      expect(marker).toBeTruthy();
    });
  });

  it('renders Loyola Campus marker', async () => {
    const { getByTestId } = renderWithTheme(<Index />);

    await waitFor(() => {
      const marker = getByTestId('marker-Loyola Campus');
      expect(marker).toBeTruthy();
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
});
