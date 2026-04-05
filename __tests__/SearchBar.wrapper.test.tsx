import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { MapViewDirectionsMode } from 'react-native-maps-directions';
import SearchBar from '../components/searchBar';
import type { BuildingChoice } from '../constants/searchBar.types';

let latestExpandedProps: any = null;

jest.mock('../components/collapsedSearchBar', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onOpen }: { onOpen: () => void }) => (
      <TouchableOpacity testID="collapsed-open" onPress={onOpen}>
        <Text>Open Search</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../components/expandedSearchBar', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      latestExpandedProps = props;
      return (
        <View testID="expanded-root">
          <Text testID="expanded-campus">{props.campus}</Text>
          <TouchableOpacity testID="expanded-close" onPress={props.onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="expanded-campus-loyola"
            onPress={() => props.onCampusSelect('Loyola')}
          >
            <Text>Select Loyola</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

const mockBuildings: BuildingChoice[] = [
  {
    id: '1',
    name: 'Hall (H)',
    code: 'H',
    coordinate: { latitude: 45.497, longitude: -73.579 },
    campus: 'SGW',
  },
];

const roomOptionsByBuilding = {
  H: ['820', '821'],
};

function makeProps(overrides: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  return {
    buildings: mockBuildings,
    roomOptionsByBuilding,
    start: null,
    destination: null,
    onChangeStart: jest.fn(),
    onChangeDestination: jest.fn(),
    transportMode: 'WALKING' as MapViewDirectionsMode,
    onChangeTransportMode: jest.fn(),
    routeActive: false,
    onOpenBuilding: jest.fn(),
    onStartRoute: jest.fn(),
    onEndRoute: jest.fn(),
    onPreviewRoute: jest.fn(),
    onExitPreview: jest.fn(),
    previewActive: false,
    previewRouteInfo: { distanceText: null, durationText: null },
    useShuttle: false,
    onUseShuttleChange: jest.fn(),
    onCampusChange: jest.fn(),
    ...overrides,
  };
}

describe('<SearchBar /> wrapper behavior', () => {
  beforeEach(() => {
    latestExpandedProps = null;
  });

  it('renders collapsed bar by default', () => {
    const { getByTestId, queryByTestId } = render(<SearchBar {...makeProps()} />);
    expect(getByTestId('collapsed-open')).toBeTruthy();
    expect(queryByTestId('expanded-root')).toBeNull();
  });

  it('opens expanded bar from collapsed state', () => {
    const { getByTestId } = render(<SearchBar {...makeProps()} />);
    fireEvent.press(getByTestId('collapsed-open'));
    expect(getByTestId('expanded-root')).toBeTruthy();
  });

  it('forwards roomOptionsByBuilding to ExpandedSearchBar', () => {
    render(<SearchBar {...makeProps({ defaultExpanded: true })} />);
    expect(latestExpandedProps.roomOptionsByBuilding).toBe(roomOptionsByBuilding);
  });

  it('forwards callbacks and route props to ExpandedSearchBar', () => {
    const props = makeProps({ defaultExpanded: true });
    render(<SearchBar {...props} />);

    expect(latestExpandedProps.onChangeStart).toBe(props.onChangeStart);
    expect(latestExpandedProps.onChangeDestination).toBe(props.onChangeDestination);
    expect(latestExpandedProps.onChangeTransportMode).toBe(props.onChangeTransportMode);
    expect(latestExpandedProps.onStartRoute).toBe(props.onStartRoute);
    expect(latestExpandedProps.previewActive).toBe(false);
    expect(latestExpandedProps.routeActive).toBe(false);
  });

  it('collapses back when ExpandedSearchBar onClose is called', () => {
    const { getByTestId, queryByTestId } = render(
      <SearchBar {...makeProps({ defaultExpanded: true })} />
    );

    expect(getByTestId('expanded-root')).toBeTruthy();
    fireEvent.press(getByTestId('expanded-close'));
    expect(queryByTestId('expanded-root')).toBeNull();
    expect(getByTestId('collapsed-open')).toBeTruthy();
  });

  it('uses SGW as default campus and updates campus after selection', () => {
    const { getByTestId } = render(<SearchBar {...makeProps({ defaultExpanded: true })} />);

    expect(getByTestId('expanded-campus').props.children).toBe('SGW');
    fireEvent.press(getByTestId('expanded-campus-loyola'));
    expect(getByTestId('expanded-campus').props.children).toBe('Loyola');
  });

  it('calls onCampusChange when campus is selected in expanded bar', () => {
    const onCampusChange = jest.fn();
    const { getByTestId } = render(
      <SearchBar {...makeProps({ defaultExpanded: true, onCampusChange })} />
    );

    fireEvent.press(getByTestId('expanded-campus-loyola'));
    expect(onCampusChange).toHaveBeenCalledWith('Loyola');
  });

  it('clears shuttle when campus changes and shuttle is active', () => {
    const onUseShuttleChange = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        {...makeProps({
          defaultExpanded: true,
          useShuttle: true,
          onUseShuttleChange,
        })}
      />
    );

    fireEvent.press(getByTestId('expanded-campus-loyola'));
    expect(onUseShuttleChange).toHaveBeenCalledWith(false);
  });

  it('does not clear shuttle when campus changes and shuttle is inactive', () => {
    const onUseShuttleChange = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        {...makeProps({
          defaultExpanded: true,
          useShuttle: false,
          onUseShuttleChange,
        })}
      />
    );

    fireEvent.press(getByTestId('expanded-campus-loyola'));
    expect(onUseShuttleChange).not.toHaveBeenCalled();
  });

  it('forwards onPoiCategorySearch to ExpandedSearchBar', () => {
    const onPoiCategorySearch = jest.fn();
    render(<SearchBar {...makeProps({ defaultExpanded: true, onPoiCategorySearch })} />);

    expect(latestExpandedProps.onPoiCategorySearch).toBe(onPoiCategorySearch);
  });

  it('calls onSearchBarOpen when collapsed bar is opened', () => {
    const onSearchBarOpen = jest.fn();
    const { getByTestId } = render(<SearchBar {...makeProps({ onSearchBarOpen })} />);

    fireEvent.press(getByTestId('collapsed-open'));

    expect(onSearchBarOpen).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onSearchBarOpen is not provided', () => {
    const { getByTestId } = render(<SearchBar {...makeProps()} />);

    expect(() => {
      fireEvent.press(getByTestId('collapsed-open'));
    }).not.toThrow();
  });

  it('expands search bar and calls onSearchBarOpen in sequence', () => {
    const onSearchBarOpen = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <SearchBar {...makeProps({ onSearchBarOpen })} />
    );

    expect(queryByTestId('expanded-root')).toBeNull();

    fireEvent.press(getByTestId('collapsed-open'));

    expect(onSearchBarOpen).toHaveBeenCalledTimes(1);
    expect(getByTestId('expanded-root')).toBeTruthy();
  });
});
