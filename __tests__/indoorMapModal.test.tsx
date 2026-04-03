import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import IndoorMapModal from '../components/indoorMapModal';
import { IndoorPathfinder } from '../utils/indoorPathfinder';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible?: boolean }) =>
    visible ? React.createElement(React.Fragment, null, children) : null;

  return {
    __esModule: true,
    default: MockModal,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

const mockFindShortestPath = jest.fn();

jest.mock('@/styles/indoorMapModal.styles', () => ({
  styles: new Proxy(
    {},
    {
      get: () => ({}),
    }
  ),
}));

const mockGetBuildingIndoorMap = jest.fn();
const mockGetBuildingIndoorGraphData = jest.fn();
const mockGetFloorLabel = jest.fn((floor: number) => `${floor}`);

jest.mock('@/utils/indoorMapData', () => ({
  getBuildingIndoorMap: (...args: unknown[]) => mockGetBuildingIndoorMap(...args),
  getBuildingIndoorGraphData: (...args: unknown[]) => mockGetBuildingIndoorGraphData(...args),
  getFloorLabel: (...args: unknown[]) => mockGetFloorLabel(...args),
}));

const routeNode = (
  id: string,
  floor: number,
  x: number,
  y: number,
  label: string,
  type: string = 'room'
) => ({
  id,
  type,
  buildingId: 'H',
  floor,
  x,
  y,
  label,
  accessible: true,
});

const createIndoorMap = () => ({
  buildingId: 'H',
  floors: [
    {
      floor: 1,
      image: 1,
      canvasWidth: 1000,
      canvasHeight: 1000,
      nodes: [
        {
          id: 'r1',
          type: 'room',
          buildingId: 'H',
          floor: 1,
          x: 100,
          y: 120,
          label: 'H-101',
          accessible: true,
        },
        {
          id: 'r-wash',
          type: 'room',
          buildingId: 'H',
          floor: 1,
          x: 140,
          y: 170,
          label: 'Gender Neutral Washroom',
          accessible: true,
        },
        {
          id: 'r-water',
          type: 'room',
          buildingId: 'H',
          floor: 1,
          x: 160,
          y: 190,
          label: 'Water Station',
          accessible: false,
        },
        {
          id: 'v1',
          type: 'vending_machine',
          buildingId: 'H',
          floor: 1,
          x: 180,
          y: 210,
          label: 'Vending Machine',
          accessible: true,
        },
        {
          id: 'r-empty',
          type: 'room',
          buildingId: 'H',
          floor: 1,
          x: 190,
          y: 220,
          label: '   ',
          accessible: true,
        },
        {
          id: 'e1',
          type: 'elevator',
          buildingId: 'H',
          floor: 1,
          x: 220,
          y: 240,
          label: 'Main Elevator',
          accessible: true,
        },
        {
          id: 'w1',
          type: 'water_fountain',
          buildingId: 'H',
          floor: 1,
          x: 260,
          y: 280,
          label: '',
          accessible: true,
        },
      ],
    },
    {
      floor: 2,
      image: 2,
      canvasWidth: 1000,
      canvasHeight: 1000,
      nodes: [
        {
          id: 'r2',
          type: 'room',
          buildingId: 'H',
          floor: 2,
          x: 300,
          y: 320,
          label: 'H-201',
          accessible: false,
        },
      ],
    },
  ],
});

const createMapWithoutFloorOne = () => ({
  buildingId: 'MB',
  floors: [
    {
      floor: -2,
      image: 1,
      canvasWidth: 1000,
      canvasHeight: 1000,
      nodes: [
        {
          id: 'mb-s2',
          type: 'room',
          buildingId: 'MB',
          floor: -2,
          x: 100,
          y: 100,
          label: 'MB-S2-100',
          accessible: false,
        },
      ],
    },
    {
      floor: 2,
      image: 2,
      canvasWidth: 1000,
      canvasHeight: 1000,
      nodes: [],
    },
  ],
});

describe('<IndoorMapModal />', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(IndoorPathfinder.prototype, 'findShortestPath').mockImplementation((...args: unknown[]) =>
      mockFindShortestPath(...args)
    );
    mockGetBuildingIndoorMap.mockReturnValue(createIndoorMap());
    mockGetBuildingIndoorGraphData.mockReturnValue([{ nodes: [], edges: [] }]);
    mockFindShortestPath.mockReturnValue([
      routeNode('r1', 1, 100, 120, 'H-101'),
      routeNode('e1', 1, 220, 240, '', 'elevator_door'),
      routeNode('e2', 2, 230, 260, '', 'elevator_door'),
      routeNode('r2', 2, 300, 320, 'H-201'),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetBuildingIndoorMap.mockReturnValue(createIndoorMap());
  });

  it('renders empty state when no indoor map exists for the building', () => {
    mockGetBuildingIndoorMap.mockReturnValue(null);

    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="ZZ" onClose={onClose} />
    );

    expect(getByText('No indoor floor map available.')).toBeTruthy();
    expect(getByText('Please choose a building that has indoor map data.')).toBeTruthy();
  });

  it('renders empty state when initialBuildingCode is null', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode={null} onClose={onClose} />
    );

    expect(getByText('Indoor Map')).toBeTruthy();
    expect(getByText('No indoor floor map available.')).toBeTruthy();
  });

  it('renders building title and default map tab content', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="h" onClose={onClose} />
    );

    expect(getByText('H Indoor Map')).toBeTruthy();
    expect(getByText('Floor 1')).toBeTruthy();
    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('🛗 Main Elevator')).toBeTruthy();
    expect(getByText('🥤 Vending Machine')).toBeTruthy();
  });

  it('switches to Rooms tab and filters rooms by search input', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));

    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('🛗 Main Elevator')).toBeTruthy();
    expect(getByText('💧 Water')).toBeTruthy();
    expect(getByText('🥤 Vending Machine')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Search rooms, facilities...'), 'elev');

    expect(getByText('🛗 Main Elevator')).toBeTruthy();
    expect(queryByText('H-101')).toBeNull();
  });

  it('toggles accessibility filter in Rooms tab', () => {
    const { getByText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));
    fireEvent.press(getByText('Elevator'));

    expect(getByText('🛗 Main Elevator')).toBeTruthy();
    expect(queryByText('H-101')).toBeNull();

    fireEvent.press(getByText('Elevator'));

    expect(getByText('H-101')).toBeTruthy();
  });

  it('filters by extracted accessibility from room labels', () => {
    const { getByText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));
    fireEvent.press(getByText('Washroom'));

    expect(getByText('🚻 Gender Neutral Washroom')).toBeTruthy();
    expect(queryByText('H-101')).toBeNull();
  });

  it('renders room metadata for accessible and non-accessible rooms in list view', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));

    expect(getByText('Accessible')).toBeTruthy();
    expect(getByText('Elevator facility')).toBeTruthy();

    fireEvent.press(getByText('2'));
    expect(getByText('Not accessible')).toBeTruthy();
  });

  it('selects and unselects a room in map view', () => {
    const { getByText, getAllByText, queryAllByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));

    expect(queryAllByText(/Get Directions/i).length).toBeGreaterThan(0);

    fireEvent.press(getAllByText('H-101')[0]);

    expect(queryAllByText(/Get Directions/i)).toHaveLength(0);
  });

  it('wraps floors when next and previous controls are pressed', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('▶'));
    expect(getByText('Floor 2')).toBeTruthy();

    fireEvent.press(getByText('▶'));
    expect(getByText('Floor 1')).toBeTruthy();

    fireEvent.press(getByText('◀'));
    expect(getByText('Floor 2')).toBeTruthy();
  });
  it('updates zoom level with +, −, and Reset controls', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    expect(getByText('1.0x')).toBeTruthy();

    fireEvent.press(getByText('+'));
    expect(getByText('1.5x')).toBeTruthy();

    fireEvent.press(getByText('−'));
    expect(getByText('1.0x')).toBeTruthy();

    fireEvent.press(getByText('+'));
    expect(getByText('1.5x')).toBeTruthy();

    fireEvent.press(getByText('Reset'));
    expect(getByText('1.0x')).toBeTruthy();
  });

  it('defaults to the first floor when floor 1 does not exist', () => {
    mockGetBuildingIndoorMap.mockReturnValue(createMapWithoutFloorOne());
    mockGetFloorLabel.mockImplementation((floor: number) => (floor < 0 ? `S${Math.abs(floor)}` : `${floor}`));

    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="MB" onClose={onClose} />
    );

    expect(getByText('MB Indoor Map')).toBeTruthy();
    expect(getByText('Floor S2')).toBeTruthy();
  });

  it('switches floors via floor tabs in Rooms view', () => {
    const { getByText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));
    fireEvent.press(getByText('2'));

    expect(getByText('H-201')).toBeTruthy();
    expect(queryByText('H-101')).toBeNull();
  });

  it('calls onClose when Close button is pressed', () => {
    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('computes and renders a blue route overlay after setting from and to rooms', () => {
    const { getByText, getAllByTestId } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));

    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));

    expect(mockFindShortestPath).toHaveBeenCalledWith('r1', 'r2', {
      wheelchairAccessible: false,
      avoidStairs: false,
      preferElevators: false,
    });
    expect(getByText('Route: H-101 to H-201')).toBeTruthy();
    expect(getAllByTestId('route-segment').length).toBeGreaterThan(0);
  });

  it('shows floor transition guidance for cross-floor routes', () => {
    mockFindShortestPath.mockReturnValue([
      routeNode('r1', 1, 100, 120, 'H-101'),
      routeNode('e1', 1, 220, 240, '', 'elevator_door'),
      routeNode('e2', 2, 230, 260, '', 'elevator_door'),
      routeNode('r2', 2, 300, 320, 'H-201'),
    ]);

    const { getByText, getAllByTestId } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));
    fireEvent.press(getByText('◀'));

    expect(getByText('Take elevator to Floor 2')).toBeTruthy();
    expect(getAllByTestId('cross-floor-direction').length).toBeGreaterThan(0);

    fireEvent.press(getByText('▶'));
    expect(getByText('Arrive from Floor 1')).toBeTruthy();
  });

  it('clears route state when clear button is pressed', () => {
    const { getByText, queryByText, queryAllByTestId } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));

    expect(getByText('Clear Route')).toBeTruthy();

    fireEvent.press(getByText('Clear Route'));

    expect(queryByText('Route: H-101 to H-201')).toBeNull();
    expect(queryAllByTestId('route-segment')).toHaveLength(0);
  });

  it('passes selected route options to the pathfinder', () => {
    const { getByTestId, getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByTestId('indoor.options.menu'));
    fireEvent(getByTestId('indoor.options.wheelchair'), 'valueChange', true);
    fireEvent(getByTestId('indoor.options.avoid-stairs'), 'valueChange', true);
    fireEvent(getByTestId('indoor.options.prefer-elevators'), 'valueChange', true);
    fireEvent.press(getByText('Done'));

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));

    expect(mockFindShortestPath).toHaveBeenLastCalledWith('r1', 'r2', {
      wheelchairAccessible: true,
      avoidStairs: true,
      preferElevators: true,
    });
  });

  it('uses preset route node ids and hides manual direction actions', async () => {
    const { findByText, queryByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ startNodeId: 'r1', endNodeId: 'r2' }}
        onClose={onClose}
      />
    );

    expect(await findByText('Route: H-101 to H-201')).toBeTruthy();
    expect(mockFindShortestPath).toHaveBeenCalledWith('r1', 'r2', {
      wheelchairAccessible: false,
      avoidStairs: false,
      preferElevators: false,
    });
    expect(queryByText('Get Directions To')).toBeNull();
    expect(queryByText('Get Directions From')).toBeNull();
  });

  it('end-only preset: highlights destination node and navigates to its floor without computing a route', async () => {
    // r2 is on floor 2; passing only endNodeId should select it and show floor 2
    const { findByText, queryByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ endNodeId: 'r2' }}
        onClose={onClose}
      />
    );

    expect(await findByText('Floor 2')).toBeTruthy();
    expect(mockFindShortestPath).not.toHaveBeenCalled();
    expect(queryByText(/^Route:/)).toBeNull();
  });

  it('end-only preset: highlights destination node by label and navigates to its floor', async () => {
    const { findByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ endLabel: 'H-101' }}
        onClose={onClose}
      />
    );

    // r1 (label 'H-101') is on floor 1 — floor should stay/navigate to floor 1
    expect(await findByText('Floor 1')).toBeTruthy();
    expect(mockFindShortestPath).not.toHaveBeenCalled();
  });

  it('end-only preset: does nothing when endNodeId does not match any node', async () => {
    const { getByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ endNodeId: 'nonexistent-node' }}
        onClose={onClose}
      />
    );

    // Should remain on default floor 1 with no route
    expect(getByText('Floor 1')).toBeTruthy();
    expect(mockFindShortestPath).not.toHaveBeenCalled();
  });

  it('does nothing when presetRoute has only startNodeId (no end)', async () => {
    const { getByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ startNodeId: 'r1' }}
        onClose={onClose}
      />
    );

    expect(getByText('Floor 1')).toBeTruthy();
    expect(mockFindShortestPath).not.toHaveBeenCalled();
  });

  it('sets floor to preset route start floor when preset route is provided', async () => {
    const { findByText } = render(
      <IndoorMapModal
        visible={true}
        initialBuildingCode="H"
        presetRoute={{ startNodeId: 'r2', endNodeId: 'r1' }}
        onClose={onClose}
      />
    );

    expect(await findByText('Floor 2')).toBeTruthy();
    expect(mockFindShortestPath).toHaveBeenCalledWith('r2', 'r1', {
      wheelchairAccessible: false,
      avoidStairs: false,
      preferElevators: false,
    });
  });

  it('shows an error when routing graph data is unavailable', () => {
    mockGetBuildingIndoorGraphData.mockReturnValue([]);

    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));

    expect(getByText('Indoor routing data is unavailable for this building.')).toBeTruthy();
  });

  it('allows routing between a facility and a room when a path exists', () => {
    const { getByText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('🛗 Main Elevator'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions To'));

    expect(getByText('Route: Main Elevator to H-101')).toBeTruthy();
    expect(queryByText('Directions are only supported between rooms.')).toBeNull();
  });

  it('shows an error when no route is found between selected rooms', () => {
    mockFindShortestPath.mockReturnValue([]);

    const { getByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('H-101'));
    fireEvent.press(getByText('Get Directions From'));
    fireEvent.press(getByText('▶'));
    fireEvent.press(getByText('H-201'));
    fireEvent.press(getByText('Get Directions To'));

    expect(getByText('No indoor route found from H-101 to H-201.')).toBeTruthy();
  });
});
