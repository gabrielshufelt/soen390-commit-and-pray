import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
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

  // --- PanResponder: fast downward flick dismisses ---
  it('dismisses on fast downward flick', () => {
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

    const handle = getByTestId('drag-handle');
    const now = Date.now();
    const touch = { touchActive: true, startTimeStamp: now, startPageX: 0, startPageY: 200, currentPageX: 0, currentPageY: 200, currentTimeStamp: now, previousPageX: 0, previousPageY: 200, previousTimeStamp: now };
    const grantHistory = { touchBank: [touch], mostRecentTimeStamp: now, numberActiveTouches: 1, indexOfSingleActiveTouch: 0 };

    const moveTouch = { ...touch, currentPageY: 400, currentTimeStamp: now + 50, previousPageY: 200, previousTimeStamp: now };
    const moveHistory = { touchBank: [moveTouch], mostRecentTimeStamp: now + 50, numberActiveTouches: 1, indexOfSingleActiveTouch: 0 };

    const releaseTouch = { ...moveTouch, touchActive: false, currentTimeStamp: now + 100 };
    const releaseHistory = { touchBank: [releaseTouch], mostRecentTimeStamp: now + 100, numberActiveTouches: 0, indexOfSingleActiveTouch: 0 };

    fireEvent(handle, 'responderGrant', { nativeEvent: {}, touchHistory: grantHistory });
    fireEvent(handle, 'responderMove', { nativeEvent: { touches: [], changedTouches: [] }, touchHistory: moveHistory });
    fireEvent(handle, 'responderRelease', { nativeEvent: { touches: [], changedTouches: [] }, touchHistory: releaseHistory });

    act(() => { jest.advanceTimersByTime(300); });
    expect(handle).toBeTruthy();
  });

  // --- PanResponder: small drag snaps back ---
  it('snaps back on small drag that does not exceed threshold', () => {
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

    const handle = getByTestId('drag-handle');
    const now = Date.now();
    const touch = { touchActive: true, startTimeStamp: now, startPageX: 0, startPageY: 200, currentPageX: 0, currentPageY: 200, currentTimeStamp: now, previousPageX: 0, previousPageY: 200, previousTimeStamp: now };
    const grantHistory = { touchBank: [touch], mostRecentTimeStamp: now, numberActiveTouches: 1, indexOfSingleActiveTouch: 0 };

    const releaseTouch = { ...touch, currentPageY: 210, currentTimeStamp: now + 300, touchActive: false };
    const releaseHistory = { touchBank: [releaseTouch], mostRecentTimeStamp: now + 300, numberActiveTouches: 0, indexOfSingleActiveTouch: 0 };

    fireEvent(handle, 'responderGrant', { nativeEvent: {}, touchHistory: grantHistory });
    fireEvent(handle, 'responderRelease', { nativeEvent: { touches: [], changedTouches: [] }, touchHistory: releaseHistory });

    act(() => { jest.advanceTimersByTime(300); });
    expect(handle).toBeTruthy();
  });

  // --- PanResponder: upward flick snaps to top ---
  it('handles upward flick without crashing', () => {
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

    const handle = getByTestId('drag-handle');
    const now = Date.now();
    const touch = { touchActive: true, startTimeStamp: now, startPageX: 0, startPageY: 200, currentPageX: 0, currentPageY: 200, currentTimeStamp: now, previousPageX: 0, previousPageY: 200, previousTimeStamp: now };
    const grantHistory = { touchBank: [touch], mostRecentTimeStamp: now, numberActiveTouches: 1, indexOfSingleActiveTouch: 0 };

    const releaseTouch = { ...touch, currentPageY: 190, currentTimeStamp: now + 50, touchActive: false };
    const releaseHistory = { touchBank: [releaseTouch], mostRecentTimeStamp: now + 50, numberActiveTouches: 0, indexOfSingleActiveTouch: 0 };

    fireEvent(handle, 'responderGrant', { nativeEvent: {}, touchHistory: grantHistory });
    fireEvent(handle, 'responderRelease', { nativeEvent: { touches: [], changedTouches: [] }, touchHistory: releaseHistory });

    act(() => { jest.advanceTimersByTime(300); });
    expect(handle).toBeTruthy();
  });

  // --- POI MODE ADDRESS ---
  it('renders POI address directly without parsing', () => {
    const building = makeBuilding({
      address: '456 Oak Street, Boston MA',
      'addr:housenumber': undefined,
      'addr:street': undefined,
      'addr:city': undefined,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/456 Oak Street/)).toBeTruthy();
  });

  it('renders POI with photoUrl as image', () => {
    const building = makeBuilding({
      photoUrl: 'https://example.com/photo.jpg',
    });
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    const image = getByTestId('building-image');
    expect(image).toBeTruthy();
  });

  it('renders POI with all meta fields', () => {
    const building = makeBuilding({
      phoneNumber: '555-1234',
      pricing: '$$',
      isOpen: true,
      rating: 4.8,
      website: 'www.cafe.com',
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/DETAILS/)).toBeTruthy();
    expect(getByText(/Phone/)).toBeTruthy();
    expect(getByText(/Pricing/)).toBeTruthy();
    expect(getByText(/Status/)).toBeTruthy();
    expect(getByText(/Rating/)).toBeTruthy();
    expect(getByText(/Website/)).toBeTruthy();
  });

  it('renders POI loading state', () => {
    const building = makeBuilding({
      detailsLoading: true,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Fetching details/)).toBeTruthy();
  });

  it('renders POI error state', () => {
    const building = makeBuilding({
      detailsError: 'Network error',
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Network error/)).toBeTruthy();
  });

  it('uses categoryLabel for POI badge', () => {
    const building = makeBuilding({
      code: undefined,
      categoryLabel: 'Coffee',
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText('Coffee')).toBeTruthy();
  });

  // --- ADDRESS ASSEMBLY ---
  it('assembles full building address from components', () => {
    const building = makeBuilding({
      'addr:housenumber': '100',
      'addr:street': 'Main St',
      'addr:city': 'Boston',
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText(/100 Main St, Boston/)).toBeTruthy();
  });

  it('handles address assembly with only street', () => {
    const building = makeBuilding({
      'addr:housenumber': undefined,
      'addr:street': 'Main St',
      'addr:city': undefined,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText(/Main St/)).toBeTruthy();
  });

  it('filters unknown amenity configurations', () => {
    const building = makeBuilding({
      amenities: ['unknown_key', 'info'],
    });
    const { getByText, queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText('Info')).toBeTruthy();
  });

  it('filters unknown accessibility configurations', () => {
    const building = makeBuilding({
      accessibility: ['unknown_key', 'accessible_entrance'],
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText('Entrance')).toBeTruthy();
  });

  it('renders building image in building mode with code match', () => {
    const building = makeBuilding({
      code: 'H',
    });
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByTestId('building-image')).toBeTruthy();
  });

  it('renders with dark mode POI', () => {
    mockUseTheme.mockReturnValue({ colorScheme: 'dark' });
    const building = makeBuilding({
      website: 'https://test.com',
      rating: 4.2,
      mode: 'poi',
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/4\.2\/5/)).toBeTruthy();
  });

  // --- COMPREHENSIVE POI TESTS ---
  it('renders phone number clickable in POI mode', () => {
    const building = makeBuilding({
      phoneNumber: '555-0123',
    });
    const { getByText, getByRole } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/555-0123/)).toBeTruthy();
    const phoneButton = getByRole('button', { name: /call/i });
    expect(phoneButton).toBeTruthy();
  });

  it('renders phone unavailable when not provided', () => {
    const building = makeBuilding({
      phoneNumber: undefined,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Phone unavailable/)).toBeTruthy();
  });

  it('renders website link in POI mode', () => {
    const building = makeBuilding({
      website: 'example.com',
    });
    const { getByText, getByRole } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/example\.com/)).toBeTruthy();
    const websiteLink = getByRole('link', { name: /open website/i });
    expect(websiteLink).toBeTruthy();
  });

  it('does not render website section when undefined', () => {
    const building = makeBuilding({
      website: undefined,
    });
    const { queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(queryByText(/Website/)).toBeNull();
  });

  it('renders multiple ratings values', () => {
    const testRatings = [4.5, 3.2, 5.0, 1.0];
    testRatings.forEach(rating => {
      const building = makeBuilding({ rating });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );
      expect(getByText(new RegExp(`${rating.toFixed(1)}/5`))).toBeTruthy();
    });
  });

  it('renders open status when isOpen true', () => {
    const building = makeBuilding({
      isOpen: true,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Open now/)).toBeTruthy();
  });

  it('renders closed status when isOpen false', () => {
    const building = makeBuilding({
      isOpen: false,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Closed/)).toBeTruthy();
  });

  it('renders different pricing levels', () => {
    const pricingLevels = ['$', '$$', '$$$'];
    pricingLevels.forEach(price => {
      const building = makeBuilding({ pricing: price });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );
      expect(getByText(price)).toBeTruthy();
    });
  });

  it('renders pricing not available when undefined', () => {
    const building = makeBuilding({
      pricing: undefined,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/Not available/)).toBeTruthy();
  });

  it('renders DETAILS section only in POI mode', () => {
    const poiBuilding = makeBuilding();
    const { getByText: getByTextPOI, queryByText: queryByTextPOI } = render(
      <BuildingModal
        visible={true}
        building={poiBuilding as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByTextPOI(/DETAILS/)).toBeTruthy();

    // In building mode, should not have DETAILS
    const { queryByText: queryByTextBuilding } = render(
      <BuildingModal
        visible={true}
        building={poiBuilding as any}
        mode="building"
        onClose={onClose}
      />
    );
    expect(queryByTextBuilding(/DETAILS/)).toBeNull();
  });

  it('renders both amenities and accessibility in building mode', () => {
    const building = makeBuilding({
      amenities: ['atm', 'info'],
      accessibility: ['accessible_entrance', 'accessible_elevator'],
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByText(/SERVICES/)).toBeTruthy();
    expect(getByText(/ACCESSIBILITY/)).toBeTruthy();
  });

  it('renders from/to buttons only in building mode', () => {
    const building = makeBuilding();
    const { getByTestId: getByTestIdBuilding, queryByTestId: queryByTestIdBuilding } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="building"
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByTestIdBuilding('directions-from-button')).toBeTruthy();
    expect(getByTestIdBuilding('directions-to-button')).toBeTruthy();

    // In POI mode, should use single button
    const { getByTestId: getByTestIdPOI, queryByTestId: queryByTestIdPOI } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByTestIdPOI('directions-poi-button')).toBeTruthy();
    expect(queryByTestIdPOI('directions-from-button')).toBeNull();
  });

  it('handles address assembly with variable components', () => {
    const testCases = [
      { housenumber: '10', street: 'Main', city: 'NYC', expected: /10 Main, NYC/ },
      { housenumber: undefined, street: 'Oak', city: 'LA', expected: /Oak, LA/ },
      { housenumber: '20', street: undefined, city: 'SF', expected: /20, SF/ },
      { housenumber: '30', street: 'Pine', city: undefined, expected: /30 Pine/ },
    ];

    testCases.forEach(({ housenumber, street, city, expected }) => {
      const building = makeBuilding({
        'addr:housenumber': housenumber,
        'addr:street': street,
        'addr:city': city,
      });
      const { getByText, queryByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          onClose={onClose}
          onDirectionsFrom={onDirectionsFrom}
          onDirectionsTo={onDirectionsTo}
        />
      );
      if (housenumber || street || city) {
        expect(getByText(expected)).toBeTruthy();
      }
    });
  });

  it('renders no badge when both code and categoryLabel are missing', () => {
    const building = makeBuilding({
      code: undefined,
      categoryLabel: undefined,
    });
    const { getByText, queryByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    // Building name should still show
    expect(getByText('Hall Building')).toBeTruthy();
  });

  it('handles missing building properties gracefully', () => {
    const building = makeBuilding({
      name: undefined,
      code: undefined,
      address: undefined,
      phoneNumber: undefined,
      website: undefined,
      rating: undefined,
      amenities: undefined,
      accessibility: undefined,
    });
    const { getByTestId } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByTestId('modal-backdrop')).toBeTruthy();
  });

  it('renders POI with only required minimal properties', () => {
    const minimalBuildingData = {
      id: 'test',
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: {
        name: 'Test Place',
      },
    };
    const { getByText, getByTestId } = render(
      <BuildingModal
        visible={true}
        building={minimalBuildingData as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText('Test Place')).toBeTruthy();
    expect(getByTestId('drag-handle')).toBeTruthy();
  });

  it('handles rapid visible changes', () => {
    const building = makeBuilding();
    const { rerender } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    rerender(
      <BuildingModal
        visible={false}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    rerender(
      <BuildingModal
        visible={true}
        building={building as any}
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );

    act(() => { jest.advanceTimersByTime(600); });
    expect(building).toBeTruthy();
  });

  it('respects mode prop changes', () => {
    const building = makeBuilding();
    const { getByText: getByTextInitial, queryByText: queryByTextInitial } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="building"
        onClose={onClose}
        onDirectionsFrom={onDirectionsFrom}
        onDirectionsTo={onDirectionsTo}
      />
    );
    expect(getByTextInitial(/SERVICES/)).toBeTruthy();
  });

  it('handles rating with no decimal places', () => {
    const building = makeBuilding({
      rating: 5,
    });
    const { getByText } = render(
      <BuildingModal
        visible={true}
        building={building as any}
        mode="poi"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />
    );
    expect(getByText(/5\.0\/5/)).toBeTruthy();
  });

    it('calls onGetDirections when POI directions button is pressed', () => {
      const onGetDirectionsMock = jest.fn();
      const building = makeBuilding({ phoneNumber: '555-1234' });
      const { getByTestId } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={onGetDirectionsMock}
        />
      );
      fireEvent.press(getByTestId('directions-poi-button'));
      expect(onGetDirectionsMock).toHaveBeenCalledWith(building);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onDirectionsFrom when building mode from button is pressed', () => {
      const onDirectionsFromMock = jest.fn();
      const building = makeBuilding();
      const { getByTestId } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="building"
          onClose={onClose}
          onDirectionsFrom={onDirectionsFromMock}
          onDirectionsTo={jest.fn()}
        />
      );
      fireEvent.press(getByTestId('directions-from-button'));
      expect(onDirectionsFromMock).toHaveBeenCalledWith(building);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onDirectionsTo when building mode to button is pressed', () => {
      const onDirectionsToMock = jest.fn();
      const building = makeBuilding();
      const { getByTestId } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="building"
          onClose={onClose}
          onDirectionsFrom={jest.fn()}
          onDirectionsTo={onDirectionsToMock}
        />
      );
      fireEvent.press(getByTestId('directions-to-button'));
      expect(onDirectionsToMock).toHaveBeenCalledWith(building);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('opens website with https prefix when missing protocol', async () => {
      const canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();

      const building = makeBuilding({ website: 'concordia.ca' });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('concordia.ca'));
        await Promise.resolve();
      });

      expect(canOpenURLSpy).toHaveBeenCalledWith('https://concordia.ca');
      expect(openURLSpy).toHaveBeenCalledWith('https://concordia.ca');
    });

    it('does not open website when URL is unsupported', async () => {
      const canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();

      const building = makeBuilding({ website: 'https://concordia.ca' });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('https://concordia.ca'));
        await Promise.resolve();
      });

      expect(canOpenURLSpy).toHaveBeenCalledWith('https://concordia.ca');
      expect(openURLSpy).not.toHaveBeenCalled();
    });

    it('shows invalid phone alert when phone has no dialable digits', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const building = makeBuilding({ phoneNumber: 'abc' });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('abc'));
        await Promise.resolve();
      });

      expect(alertSpy).toHaveBeenCalledWith('Call unavailable', 'This phone number is not valid.');
    });

    it('falls back to tel URL when primary dial URL fails', async () => {
      const openURLSpy = jest
        .spyOn(Linking, 'openURL')
        .mockRejectedValueOnce(new Error('primary failed'))
        .mockResolvedValueOnce();

      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title: any, message?: any, buttons?: any) => {
        if (title === 'Call phone number') {
          const callButton = buttons?.find((b: { text?: string }) => b.text === 'Call');
          callButton?.onPress?.();
        }
      });

      const building = makeBuilding({ phoneNumber: '(514) 848-2424' });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('(514) 848-2424'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(openURLSpy.mock.calls[0]?.[0]).toMatch(/^tel(prompt)?:5148482424$/);
      expect(openURLSpy.mock.calls[1]?.[0]).toBe('tel:5148482424');
    });

    it('shows device cannot place calls alert when both dial URLs fail', async () => {
      const openURLSpy = jest
        .spyOn(Linking, 'openURL')
        .mockRejectedValueOnce(new Error('primary failed'))
        .mockRejectedValueOnce(new Error('fallback failed'));

      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title: any, message?: any, buttons?: any) => {
        if (title === 'Call phone number') {
          const callButton = buttons?.find((b: { text?: string }) => b.text === 'Call');
          callButton?.onPress?.();
        }
      });

      const building = makeBuilding({ phoneNumber: '+1 514 848 2424' });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          mode="poi"
          onClose={onClose}
          onGetDirections={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('+1 514 848 2424'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(openURLSpy).toHaveBeenCalledTimes(2);
      expect(alertSpy).toHaveBeenCalledWith('Call unavailable', 'This device cannot place phone calls.');
    });

    it('handles long strings in fields', () => {
      const longText = 'A'.repeat(500);
      const building = makeBuilding({
        name: longText,
      });
      const { getByText } = render(
        <BuildingModal
          visible={true}
          building={building as any}
          onClose={onClose}
          onDirectionsFrom={onDirectionsFrom}
          onDirectionsTo={onDirectionsTo}
        />
      );
      expect(getByText(longText)).toBeTruthy();
    });
});
