import React from 'react';
import { render } from '@testing-library/react-native';
import Index from '../app/(tabs)/index';
import { ThemeProvider } from '../context/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = (props: any) => (
    <View testID="map-view" {...props}>
      {props.children}
    </View>
  );

  const MockMarker = (props: any) => (
    <View testID={`marker-${props.title}`} {...props} />
  );

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider>{component}</ThemeProvider>);
}

describe('<Index />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MapView component', async () => {
    const { findByTestId } = renderWithTheme(<Index />);

    const mapView = await findByTestId('map-view');
    expect(mapView).toBeTruthy();
  });

  it('renders SGW Campus marker', async () => {
    const { findByTestId } = renderWithTheme(<Index />);

    const marker = await findByTestId('marker-SGW Campus');
    expect(marker).toBeTruthy();
  });

  it('renders Loyola Campus marker', async () => {
    const { findByTestId } = renderWithTheme(<Index />);

    const marker = await findByTestId('marker-Loyola Campus');
    expect(marker).toBeTruthy();
  });
});
