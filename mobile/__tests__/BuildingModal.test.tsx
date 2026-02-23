import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import BuildingModal from '../components/buildingModal';

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome5: 'FontAwesome5',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../constants/buildingImages', () => ({
  __esModule: true,
  default: { H: 1, LB: 2 },
}));

jest.mock('../constants/buildingIcons', () => ({
  AMENITY_ICONS: {
    info: { lib: 'FontAwesome5', icon: 'info-circle', label: 'Info' },
    atm: { lib: 'FontAwesome5', icon: 'money-bill-wave', label: 'ATM' },
  },
  ACCESSIBILITY_ICONS: {
    accessible_entrance: { lib: 'FontAwesome5', icon: 'door-open', label: 'Entrance' },
    accessible_elevator: { lib: 'MaterialCommunityIcons', icon: 'elevator-passenger', label: 'Elevator' },
  },
  UI_ICONS: {
    close: { lib: 'FontAwesome5', icon: 'times', label: 'Close' },
    mapMarker: { lib: 'FontAwesome5', icon: 'map-marker-alt', label: 'Location' },
    route: { lib: 'FontAwesome5', icon: 'route', label: 'Route' },
  },
  renderIcon: (_config: any, _size: number, _color: string) => 'MockIcon',
}));

const makeBuilding = (overrides: Record<string, any> = {}) => ({
  id: 'b1',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  },
  properties: {
    code: 'H',
    name: 'Hall Building',
    'addr:housenumber': '1455',
    'addr:street': 'De Maisonneuve Blvd W',
    'addr:city': 'Montreal',
    'addr:province': 'Quebec',
    accessibility: ['accessible_entrance', 'accessible_elevator'],
    amenities: ['info', 'atm'],
    ...overrides,
  },
});

describe('<BuildingModal />', () => {
  const onClose = jest.fn();
  const onDirectionsFrom = jest.fn();
  const onDirectionsTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTheme.mockReturnValue({ colorScheme: 'light' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Branch: building is null => returns null ---
  it('renders nothing when building is null', () => {
    const { toJSON } = render(
      <BuildingModal
        visible={true}
        building={null}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(toJSON()).toBeNull();
  });

  // --- Branch: full building in light mode ---
  it('renders full building info in light mode', () => {
    const building = makeBuilding();
    const { getByText, getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    // Code badge and building name
    expect(getByText('H')).toBeTruthy();
    expect(getByText('Hall Building')).toBeTruthy();

    // Address (green, inline with location icon)
    expect(getByText(/1455 De Maisonneuve Blvd W, Montreal/)).toBeTruthy();

    // Building image
    expect(getByTestId('building-image')).toBeTruthy();

    // Section titles
    expect(getByText('SERVICES')).toBeTruthy();
    expect(getByText('ACCESSIBILITY')).toBeTruthy();

    // Amenity icon labels
    expect(getByText('Info')).toBeTruthy();
    expect(getByText('ATM')).toBeTruthy();

    // Accessibility icon labels
    expect(getByText('Entrance')).toBeTruthy();
    expect(getByText('Elevator')).toBeTruthy();

    // Direction buttons
    expect(getByText('Get Directions From')).toBeTruthy();
    expect(getByText('Get Directions To')).toBeTruthy();

    // Drag handle
    expect(getByTestId('drag-handle')).toBeTruthy();
  });

  // --- Branch: dark mode ---
  it('renders in dark mode', () => {
    mockUseTheme.mockReturnValue({ colorScheme: 'dark' });
    const building = makeBuilding();
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText('Hall Building')).toBeTruthy();
  });

  // --- Branch: no address properties at all ---
  it('does not render address when no address properties', () => {
    const building = makeBuilding({
      'addr:housenumber': undefined,
      'addr:street': undefined,
      'addr:city': undefined,
      'addr:province': undefined,
    });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText(/1455/)).toBeNull();
    expect(queryByText(/Montreal/)).toBeNull();
  });

  // --- Branch: city present in address ---
  it('renders city in address', () => {
    const building = makeBuilding({ 'addr:province': undefined });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText(/Montreal/)).toBeTruthy();
  });

  // --- Branch: address without city ---
  it('renders address without city', () => {
    const building = makeBuilding({ 'addr:city': undefined });
    const { getByText, queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText(/1455 De Maisonneuve/)).toBeTruthy();
    expect(queryByText(/Montreal/)).toBeNull();
  });

  // --- Branch: accessibility undefined ---
  it('does not render accessibility section when undefined', () => {
    const building = makeBuilding({ accessibility: undefined });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText('ACCESSIBILITY')).toBeNull();
  });

  // --- Branch: accessibility empty array ---
  it('does not render accessibility section when empty array', () => {
    const building = makeBuilding({ accessibility: [] });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText('ACCESSIBILITY')).toBeNull();
  });

  // --- Branch: amenities undefined ---
  it('does not render amenities section when undefined', () => {
    const building = makeBuilding({ amenities: undefined });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText('SERVICES')).toBeNull();
  });

  // --- Branch: amenities empty array ---
  it('does not render amenities section when empty array', () => {
    const building = makeBuilding({ amenities: [] });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText('SERVICES')).toBeNull();
  });

  // --- Branch: Get Directions To ---
  it('calls onDirectionsTo and onClose via Get Directions To', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    fireEvent.press(getByTestId('directions-to-button'));
    act(() => { jest.advanceTimersByTime(300); });

    expect(onDirectionsTo).toHaveBeenCalledWith(building);
    expect(onClose).toHaveBeenCalled();
  });

  // --- Branch: Get Directions From ---
  it('calls onDirectionsFrom and onClose via Get Directions From', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    fireEvent.press(getByTestId('directions-from-button'));
    act(() => { jest.advanceTimersByTime(300); });

    expect(onDirectionsFrom).toHaveBeenCalledWith(building);
    expect(onClose).toHaveBeenCalled();
  });

  // --- Close button ---
  it('calls onClose when close button is pressed', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    fireEvent.press(getByTestId('close-button'));
    act(() => { jest.advanceTimersByTime(300); });

    expect(onClose).toHaveBeenCalled();
  });

  // --- Backdrop press ---
  it('calls onClose when backdrop is pressed', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    fireEvent.press(getByTestId('modal-backdrop'));
    act(() => { jest.advanceTimersByTime(300); });

    expect(onClose).toHaveBeenCalled();
  });

  // --- Drag handle exists ---
  it('renders the drag handle', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByTestId('drag-handle')).toBeTruthy();
  });

  // --- Directions From button ---
  it('renders Get Directions From button', () => {
    const building = makeBuilding();
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByTestId('directions-from-button')).toBeTruthy();
  });

  // --- No building image when code has no image ---
  it('does not render building image when no code match', () => {
    const building = makeBuilding({ code: 'UNKNOWN' });
    const { queryByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByTestId('building-image')).toBeNull();
  });

  // --- Unknown amenity/accessibility keys filtered out ---
  it('filters out unknown amenity and accessibility keys', () => {
    const building = makeBuilding({
      amenities: ['unknown_amenity'],
      accessibility: ['unknown_access'],
    });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    // No icon labels should render for unknown keys
    expect(queryByText('Info')).toBeNull();
    expect(queryByText('ATM')).toBeNull();
    expect(queryByText('Entrance')).toBeNull();
    expect(queryByText('Elevator')).toBeNull();
  });

  // --- No code badge when code is undefined ---
  it('does not render code badge when code is undefined', () => {
    const building = makeBuilding({ code: undefined });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(queryByText('H')).toBeNull();
  });
});
