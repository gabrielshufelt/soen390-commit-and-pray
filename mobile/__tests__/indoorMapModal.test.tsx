import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import IndoorMapModal from '../components/indoorMapModal';
import { IndoorPathfinder } from '../utils/indoorPathfinder';

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

const routeNode = (id: string, floor: number, x: number, y: number, label: string) => ({
  id,
  type: 'room',
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
          id: 'r-food',
          type: 'room',
          buildingId: 'H',
          floor: 1,
          x: 180,
          y: 210,
          label: 'Campus Cafe',
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
      routeNode('r-mid', 1, 140, 160, ''),
      routeNode('r-wash', 1, 140, 170, 'Gender Neutral Washroom'),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
  });

  it('switches to Rooms tab and filters rooms by search input', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <IndoorMapModal visible={true} initialBuildingCode="H" onClose={onClose} />
    );

    fireEvent.press(getByText('Rooms'));

    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('🛗 Main Elevator')).toBeTruthy();
    expect(getByText('💧 Water')).toBeTruthy();

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

    fireEvent.press(getByText('Gender Neutral Washroom'));
    fireEvent.press(getByText('Get Directions To'));

    expect(mockFindShortestPath).toHaveBeenCalledWith('H-101', 'Gender Neutral Washroom');
    expect(getByText('Route: H-101 to Gender Neutral Washroom')).toBeTruthy();
    expect(getAllByTestId('route-segment').length).toBeGreaterThan(0);
  });

  it('shows floor transition guidance for cross-floor routes', () => {
    mockFindShortestPath.mockReturnValue([
      routeNode('r1', 1, 100, 120, 'H-101'),
      routeNode('e1', 1, 220, 240, ''),
      routeNode('e2', 2, 230, 260, ''),
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
    fireEvent.press(getByText('Gender Neutral Washroom'));
    fireEvent.press(getByText('Get Directions To'));

    expect(getByText('Clear Route')).toBeTruthy();

    fireEvent.press(getByText('Clear Route'));

    expect(queryByText('Route: H-101 to Gender Neutral Washroom')).toBeNull();
    expect(queryAllByTestId('route-segment')).toHaveLength(0);
  });
});
