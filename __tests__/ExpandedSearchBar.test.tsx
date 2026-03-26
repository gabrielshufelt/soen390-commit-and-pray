import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import type { MapViewDirectionsMode } from 'react-native-maps-directions';
import ExpandedSearchBar from '../components/expandedSearchBar';
import type { BuildingChoice } from '../constants/searchBar.types';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }: { name: string }) => <Text>{name}</Text> };
});

const mockShuttleAvailability = jest.fn();
jest.mock('../hooks/useShuttleAvailability', () => ({
  useShuttleAvailability: (campus: 'SGW' | 'Loyola') => mockShuttleAvailability(campus),
}));

jest.mock('../components/TransportModeSelector', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <View testID="transport-mode-selector">
        <Text testID="transport-mode-selector.current">{props.selectedMode}</Text>
        <TouchableOpacity
          testID="transport-mode-selector.to-transit"
          onPress={() => props.onModeSelect?.('TRANSIT')}
        />
        <TouchableOpacity
          testID="transport-mode-selector.to-walking"
          onPress={() => props.onModeSelect?.('WALKING')}
        />
      </View>
    ),
  };
});

const mockBuildings: BuildingChoice[] = [
  {
    id: '1',
    name: 'Henry F. Hall Building (H)',
    code: 'H',
    coordinate: { latitude: 45.497, longitude: -73.579 },
    campus: 'SGW',
  },
  {
    id: '2',
    name: 'John Molson School of Business (MB)',
    code: 'MB',
    coordinate: { latitude: 45.495, longitude: -73.578 },
    campus: 'SGW',
  },
  {
    id: '3',
    name: 'Administration Building (AD)',
    code: 'AD',
    coordinate: { latitude: 45.458, longitude: -73.639 },
    campus: 'Loyola',
  },
];

const baseProps = {
  buildings: mockBuildings,
  roomOptionsByBuilding: {
    H: ['820', '821', '920'],
    MB: ['S2.120', '1.210'],
  },
  start: null as BuildingChoice | null,
  destination: null as BuildingChoice | null,
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
  campus: 'SGW' as const,
  onCampusSelect: jest.fn(),
  onClose: jest.fn(),
};

describe('<ExpandedSearchBar />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShuttleAvailability.mockReturnValue({ available: false, nextDeparture: null });
  });

  it('renders expanded route UI', () => {
    const { getByText, getByTestId } = render(<ExpandedSearchBar {...baseProps} />);
    expect(getByText('Route')).toBeTruthy();
    expect(getByTestId('route.start.input')).toBeTruthy();
    expect(getByTestId('route.dest.input')).toBeTruthy();
  });

  it('shows destination suggestions and picks a destination', async () => {
    const onChangeDestination = jest.fn();
    const { getByTestId, getByText } = render(
      <ExpandedSearchBar {...baseProps} onChangeDestination={onChangeDestination} />
    );

    const destInput = getByTestId('route.dest.input');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'Hall');

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building \(H\)/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Henry F\. Hall Building \(H\)/));

    expect(onChangeDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', code: 'H' })
    );
  });

  it('shows start suggestions and picks a start building', async () => {
    const onChangeStart = jest.fn();
    const { getByTestId, getByText } = render(
      <ExpandedSearchBar {...baseProps} onChangeStart={onChangeStart} />
    );

    const startInput = getByTestId('route.start.input');
    fireEvent(startInput, 'focus');
    fireEvent.changeText(startInput, 'Molson');

    await waitFor(() => {
      expect(getByText(/John Molson School of Business \(MB\)/)).toBeTruthy();
    });

    fireEvent.press(getByText(/John Molson School of Business \(MB\)/));

    expect(onChangeStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', code: 'MB' })
    );
  });

  it('shows start room suggestions and selects a room', async () => {
    const onChangeStart = jest.fn();
    const start = mockBuildings[0];
    const { getByTestId, getByText } = render(
      <ExpandedSearchBar {...baseProps} start={start} onChangeStart={onChangeStart} />
    );

    const roomInput = getByTestId('route.start.room.input');
    fireEvent(roomInput, 'focus');

    await waitFor(() => {
      expect(getByText('820')).toBeTruthy();
    });

    fireEvent.press(getByText('820'));

    expect(onChangeStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', room: '820' })
    );
  });

  it('shows destination room suggestions and selects a room', async () => {
    const onChangeDestination = jest.fn();
    const destination = mockBuildings[1];
    const { getByTestId, getByText } = render(
      <ExpandedSearchBar
        {...baseProps}
        destination={destination}
        onChangeDestination={onChangeDestination}
      />
    );

    const roomInput = getByTestId('route.dest.room.input');
    fireEvent(roomInput, 'focus');

    await waitFor(() => {
      expect(getByText('S2.120')).toBeTruthy();
    });

    fireEvent.press(getByText('S2.120'));

    expect(onChangeDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', room: 'S2.120' })
    );
  });

  it('shows Start Directions when destination exists and start is current location', () => {
    const onStartRoute = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExpandedSearchBar
        {...baseProps}
        destination={mockBuildings[0]}
        start={null}
        onStartRoute={onStartRoute}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('route.start.button'));
    expect(onStartRoute).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Preview Route when destination exists and start is a building', () => {
    const onPreviewRoute = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExpandedSearchBar
        {...baseProps}
        destination={mockBuildings[0]}
        start={mockBuildings[1]}
        onPreviewRoute={onPreviewRoute}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('route.preview.button'));
    expect(onPreviewRoute).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Exit Preview when previewActive is true', () => {
    const onExitPreview = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExpandedSearchBar
        {...baseProps}
        destination={mockBuildings[0]}
        start={mockBuildings[1]}
        previewActive={true}
        onExitPreview={onExitPreview}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('route.exit-preview.button'));
    expect(onExitPreview).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows End Directions button when route is active', () => {
    const onEndRoute = jest.fn();
    const { getByTestId } = render(
      <ExpandedSearchBar {...baseProps} routeActive={true} onEndRoute={onEndRoute} />
    );

    fireEvent.press(getByTestId('route.end.button'));
    expect(onEndRoute).toHaveBeenCalledTimes(1);
  });

  it('disables shuttle for same-campus trip in transit mode', async () => {
    const onUseShuttleChange = jest.fn();
    mockShuttleAvailability.mockReturnValue({ available: true, nextDeparture: '10:00' });

    const start = { ...mockBuildings[0], id: 'start-h' };
    const destination = { ...mockBuildings[1], id: 'dest-mb' };

    const { getByText } = render(
      <ExpandedSearchBar
        {...baseProps}
        transportMode={'TRANSIT' as MapViewDirectionsMode}
        start={start}
        destination={destination}
        useShuttle={true}
        onUseShuttleChange={onUseShuttleChange}
      />
    );

    await waitFor(() => {
      expect(onUseShuttleChange).toHaveBeenCalledWith(false);
      expect(getByText('Shuttle is only available between SGW and Loyola campuses.')).toBeTruthy();
    });
  });

  it('toggles shuttle checkbox when transit is available across campuses', async () => {
    const onUseShuttleChange = jest.fn();
    mockShuttleAvailability.mockReturnValue({ available: true, nextDeparture: '10:00' });

    const start = { ...mockBuildings[0], id: 'start-h', campus: 'SGW' as const };
    const destination = { ...mockBuildings[2], id: 'dest-ad', campus: 'Loyola' as const };

    const { getByTestId, getByText } = render(
      <ExpandedSearchBar
        {...baseProps}
        transportMode={'TRANSIT' as MapViewDirectionsMode}
        start={start}
        destination={destination}
        useShuttle={false}
        onUseShuttleChange={onUseShuttleChange}
      />
    );

    expect(getByText('Next: 10:00')).toBeTruthy();
    fireEvent.press(getByTestId('shuttle.checkbox'));
    expect(onUseShuttleChange).toHaveBeenCalledWith(true);
  });

  it('clears shuttle usage when switching mode away from transit', () => {
    const onUseShuttleChange = jest.fn();
    const onChangeTransportMode = jest.fn();

    const { getByTestId } = render(
      <ExpandedSearchBar
        {...baseProps}
        useShuttle={true}
        onUseShuttleChange={onUseShuttleChange}
        onChangeTransportMode={onChangeTransportMode}
      />
    );

    fireEvent.press(getByTestId('transport-mode-selector.to-walking'));

    expect(onChangeTransportMode).toHaveBeenCalledWith('WALKING');
    expect(onUseShuttleChange).toHaveBeenCalledWith(false);
  });

  it('opens suggested building details from history chevron', async () => {
    const onOpenBuilding = jest.fn();
    const { getByTestId, getByText, getByLabelText } = render(
      <ExpandedSearchBar {...baseProps} onOpenBuilding={onOpenBuilding} />
    );

    const destInput = getByTestId('route.dest.input');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'Hall');

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building \(H\)/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Henry F\. Hall Building \(H\)/));

    await waitFor(() => {
      expect(getByLabelText(/View details for Henry F\. Hall Building/)).toBeTruthy();
    });

    fireEvent.press(getByLabelText(/View details for Henry F\. Hall Building/));
    expect(onOpenBuilding).toHaveBeenCalledWith(expect.objectContaining({ id: '1', code: 'H' }));
  });

  it('picks a destination from suggested history cards', async () => {
    const onChangeDestination = jest.fn();
    const { getByTestId, getByText } = render(
      <ExpandedSearchBar {...baseProps} onChangeDestination={onChangeDestination} />
    );

    const destInput = getByTestId('route.dest.input');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'Hall');

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building \(H\)/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Henry F\. Hall Building \(H\)/));

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Henry F\. Hall Building/));

    expect(onChangeDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', code: 'H' })
    );
  });

  it('filters suggested history by quick filter category', async () => {
    const categorizedBuildings: BuildingChoice[] = [
      { ...mockBuildings[0], category: 'Library' as any },
      { ...mockBuildings[1], category: 'Home' as any },
    ];

    const { getByTestId, getByText, queryByText } = render(
      <ExpandedSearchBar {...baseProps} buildings={categorizedBuildings} />
    );

    const destInput = getByTestId('route.dest.input');
    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'Hall');
    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building \(H\)/)).toBeTruthy();
    });
    fireEvent.press(getByText(/Henry F\. Hall Building \(H\)/));

    fireEvent(destInput, 'focus');
    fireEvent.changeText(destInput, 'Molson');
    await waitFor(() => {
      expect(getByText(/John Molson School of Business \(MB\)/)).toBeTruthy();
    });
    fireEvent.press(getByText(/John Molson School of Business \(MB\)/));

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building/)).toBeTruthy();
      expect(getByText(/John Molson School of Business/)).toBeTruthy();
    });

    fireEvent.press(getByText('Library'));

    await waitFor(() => {
      expect(getByText(/Henry F\. Hall Building/)).toBeTruthy();
      expect(queryByText(/John Molson School of Business/)).toBeNull();
    });
  });

  it('opens See All modal, picks building, and closes modal', async () => {
    const onChangeDestination = jest.fn();
    const { getByText, queryByText } = render(
      <ExpandedSearchBar {...baseProps} onChangeDestination={onChangeDestination} />
    );

    fireEvent.press(getByText('See All'));
    await waitFor(() => {
      expect(getByText('All Buildings')).toBeTruthy();
    });

    fireEvent.press(getByText(/John Molson School of Business/));

    expect(onChangeDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', code: 'MB' })
    );

    await waitFor(() => {
      expect(queryByText('All Buildings')).toBeNull();
    });
  });

  it('closes See All modal with close button', async () => {
    const { getByText, getByLabelText, queryByText } = render(
      <ExpandedSearchBar {...baseProps} />
    );

    fireEvent.press(getByText('See All'));
    await waitFor(() => {
      expect(getByText('All Buildings')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => {
      expect(queryByText('All Buildings')).toBeNull();
    });
  });

  it('handles modal onRequestClose callback', async () => {
    const { getByText, UNSAFE_getAllByType, queryByText } = render(
      <ExpandedSearchBar {...baseProps} />
    );

    fireEvent.press(getByText('See All'));
    await waitFor(() => {
      expect(getByText('All Buildings')).toBeTruthy();
    });

    const { Modal } = require('react-native');
    const modals = UNSAFE_getAllByType(Modal);
    const seeAllModal = modals[modals.length - 1];
    act(() => {
      seeAllModal.props.onRequestClose();
    });

    await waitFor(() => {
      expect(queryByText('All Buildings')).toBeNull();
    });
  });
});
