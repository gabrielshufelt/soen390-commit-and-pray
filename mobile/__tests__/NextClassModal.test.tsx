import React from 'react';
import { render } from '@testing-library/react-native';
import NextClassModal from '../components/NextClassModal';
import { ParsedNextClass, NextClassStatus } from '../hooks/useNextClass';

// Fixed "now" so countdown math is deterministic
jest.mock('../utils/devConfig', () => ({
  DEV_OVERRIDE_TIME: new Date('2026-01-13T12:00:00'), // noon
  DEV_OVERRIDE_LOCATION: null,
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: jest.fn(() => ({ colorScheme: 'light' })),
}));

// Export NO_CLASS_BEHAVIOR as 'show_message' so the no_class branch renders
jest.mock('../hooks/useNextClass', () => ({
  NO_CLASS_BEHAVIOR: 'show_message',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Sample next class (starts at 13:15, which is 75 min after the mocked "noon")
const makeNextClass = (overrides: Partial<ParsedNextClass> = {}): ParsedNextClass => ({
  title: 'PHYS 468',
  buildingCode: 'CJ',
  buildingName: 'Communication Studies and Journalism Building',
  room: '1.129',
  startTime: new Date('2026-01-13T13:15:00'),
  endTime: new Date('2026-01-13T14:30:00'),
  walkingMinutes: 8,
  rawLocation: 'CJ Building 1.129',
  ...overrides,
});

function renderModal(
  nextClass: ParsedNextClass | null,
  status: NextClassStatus,
  isLoading = false,
) {
  return render(
    <NextClassModal nextClass={nextClass} status={status} isLoading={isLoading} />,
  );
}

describe('NextClassModal', () => {
  // Loading states
  it('renders a spinner when isLoading is true', () => {
    const { UNSAFE_queryByType } = renderModal(null, 'found', true);
    // ActivityIndicator should be present
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  it('renders a spinner when status is "loading"', () => {
    const { UNSAFE_queryByType } = renderModal(null, 'loading', false);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  // No calendar selected
  it('renders nothing when status is "no_calendar"', () => {
    const { toJSON } = renderModal(null, 'no_calendar');
    expect(toJSON()).toBeNull();
  });

  // Error state
  it('renders nothing when status is "error"', () => {
    const { toJSON } = renderModal(null, 'error');
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when status is "found" but nextClass is null', () => {
    const { toJSON } = renderModal(null, 'found');
    expect(toJSON()).toBeNull();
  });

  // School day finished
  it('shows school day finished message when status is "done_today"', () => {
    const { getByText } = renderModal(null, 'done_today');
    expect(getByText('School day finished — see you tomorrow!')).toBeTruthy();
  });

  // No classes today
  it('shows "No classes today" when status is "no_class" and NO_CLASS_BEHAVIOR is show_message', () => {
    const { getByText } = renderModal(null, 'no_class');
    expect(getByText('No classes today')).toBeTruthy();
  });

  // Found state: class info
  it('shows NEXT CLASS label when a class is found', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('NEXT CLASS')).toBeTruthy();
  });

  it('shows class title', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('PHYS 468')).toBeTruthy();
  });

  it('shows building badge with code', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('CJ')).toBeTruthy();
  });

  it('shows room label formatted as "CODE-room"', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('CJ-1.129')).toBeTruthy();
  });

  it('shows only building code when room is empty', () => {
    const { getAllByText } = renderModal(
      makeNextClass({ room: '', buildingCode: 'H', buildingName: 'Henry F. Hall Building' }),
      'found',
    );
    // roomLabel falls back to just the building code; the code may appear
    // in both the badge and the room label so we accept one or more matches.
    expect(getAllByText('H').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "?" as building badge when buildingCode is empty', () => {
    const { getByText } = renderModal(
      makeNextClass({ buildingCode: '', room: '' }),
      'found',
    );
    expect(getByText('?')).toBeTruthy();
  });

  it('shows "Unknown Class" when title is empty', () => {
    const { getByText } = renderModal(makeNextClass({ title: '' }), 'found');
    expect(getByText('Unknown Class')).toBeTruthy();
  });

  it('shows walking time in minutes', () => {
    const { getByText } = renderModal(makeNextClass({ walkingMinutes: 8 }), 'found');
    expect(getByText(' 8 min walk')).toBeTruthy();
  });

  it('shows "Walk time unavailable" when walkingMinutes is null', () => {
    const { getByText } = renderModal(makeNextClass({ walkingMinutes: null }), 'found');
    expect(getByText(' Walk time unavailable')).toBeTruthy();
  });

  it('shows "Get Directions" button', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('Get Directions')).toBeTruthy();
  });

  it('shows "In X min" countdown when class is in the future', () => {
    const { getByText } = renderModal(makeNextClass(), 'found');
    // startTime is 13:15, DEV_OVERRIDE_TIME is 12:00 -> 75 min away
    expect(getByText('In 75 min')).toBeTruthy();
  });

  it('shows "Starting now" when minutesUntil is 0', () => {
    // Set startTime == DEV_OVERRIDE_TIME (noon exactly)
    const nc = makeNextClass({ startTime: new Date('2026-01-13T12:00:00') });
    const { getByText } = renderModal(nc, 'found');
    expect(getByText('Starting now')).toBeTruthy();
  });

  // Dark mode
  it('renders correctly in dark mode', () => {
    const { useTheme } = require('../context/ThemeContext');
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'dark' });

    const { getByText } = renderModal(makeNextClass(), 'found');
    expect(getByText('PHYS 468')).toBeTruthy();

    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
  });
});
