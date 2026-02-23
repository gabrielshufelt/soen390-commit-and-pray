import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ShuttleScheduleModal from '../components/shuttleScheduleModal';

const mockUseTheme = jest.fn();
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
}));

describe('<ShuttleScheduleModal />', () => {
  const onClose = jest.fn();
  const onShowRoute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ colorScheme: 'light' });
  });

  // --- Visibility ---

  it('renders nothing (no title) when not visible', () => {
    const { queryByText } = render(
      <ShuttleScheduleModal visible={false} onClose={onClose} />
    );
    expect(queryByText('🚌 Shuttle Schedule')).toBeNull();
  });

  it('renders the modal title when visible', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('🚌 Shuttle Schedule')).toBeTruthy();
  });

  // --- Default tab (Mon-Thu) ---

  it('shows Mon-Thu and Friday tabs', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('Mon-Thu')).toBeTruthy();
    expect(getByText('Friday')).toBeTruthy();
  });

  it('shows Loyola and SGW departure column headers by default', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('Loyola Departures')).toBeTruthy();
    expect(getByText('SGW Departures')).toBeTruthy();
  });

  it('shows Mon-Thu Loyola departure times by default', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    // First Mon-Thu Loyola departure
    expect(getByText('9:15')).toBeTruthy();
    // Last Mon-Thu Loyola departure (unique to Mon-Thu)
    expect(getByText('18:30*')).toBeTruthy();
  });

  it('shows Mon-Thu SGW departure times by default', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    // Last SGW departure on Mon-Thu (appears at bottom of SGW column)
    expect(getByText('22:30')).toBeTruthy();
  });

  it('shows Mon-Thu last bus notes', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText(/Last bus - Loyola/)).toBeTruthy();
    expect(getByText(/Last bus - SGW/)).toBeTruthy();
  });

  // --- Friday tab ---

  it('switches to Friday schedule when Friday tab is pressed', () => {
    const { getByText, queryByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    // Mon-Thu has 18:30* as final Loyola departure
    expect(getByText('18:30*')).toBeTruthy();

    fireEvent.press(getByText('Friday'));

    // 18:30* is not in Friday schedule
    expect(queryByText('18:30*')).toBeNull();
    // Friday has 18:15* instead
    expect(getByText('18:15*')).toBeTruthy();
  });

  it('still shows departure column headers after switching to Friday', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    fireEvent.press(getByText('Friday'));
    expect(getByText('Loyola Departures')).toBeTruthy();
    expect(getByText('SGW Departures')).toBeTruthy();
  });

  // --- Bus stops section ---

  it('shows "Bus Stops" heading', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('Bus Stops')).toBeTruthy();
  });

  it('shows Loyola bus stop label and name', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('Loyola')).toBeTruthy();
    expect(getByText('Loyola Chapel')).toBeTruthy();
    expect(getByText('7137 Sherbrooke St. W.')).toBeTruthy();
  });

  it('shows SGW bus stop label and name', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('SGW')).toBeTruthy();
    expect(getByText('Henry F. Hall Building')).toBeTruthy();
    expect(getByText('1455 De Maisonneuve Blvd. W.')).toBeTruthy();
  });

  // --- Disclaimer ---

  it('shows the disclaimer text', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText(/approximate/)).toBeTruthy();
  });

  // --- Route button ---

  it('does NOT show the route button when onShowRoute is not provided', () => {
    const { queryByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(queryByText(/Show Shuttle Route/)).toBeNull();
  });

  it('shows the route button when onShowRoute is provided', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} onShowRoute={onShowRoute} />
    );
    expect(getByText('🗺️ Show Shuttle Route on Map')).toBeTruthy();
  });

  it('calls onShowRoute and onClose when route button is pressed', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} onShowRoute={onShowRoute} />
    );
    fireEvent.press(getByText('🗺️ Show Shuttle Route on Map'));
    expect(onShowRoute).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // --- Close button ---

  it('calls onClose when the × button is pressed', () => {
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    fireEvent.press(getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // --- Dark mode ---

  it('renders the title correctly in dark mode', () => {
    mockUseTheme.mockReturnValue({ colorScheme: 'dark' });
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('🚌 Shuttle Schedule')).toBeTruthy();
  });

  it('renders bus stops section in dark mode', () => {
    mockUseTheme.mockReturnValue({ colorScheme: 'dark' });
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} />
    );
    expect(getByText('Bus Stops')).toBeTruthy();
  });

  it('renders route button in dark mode when onShowRoute is provided', () => {
    mockUseTheme.mockReturnValue({ colorScheme: 'dark' });
    const { getByText } = render(
      <ShuttleScheduleModal visible={true} onClose={onClose} onShowRoute={onShowRoute} />
    );
    expect(getByText('🗺️ Show Shuttle Route on Map')).toBeTruthy();
  });
});
