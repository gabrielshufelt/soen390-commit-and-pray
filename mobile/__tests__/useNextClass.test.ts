import { renderHook, waitFor } from '@testing-library/react-native';
import { useNextClass } from '../hooks/useNextClass';
import { useCalendar, fetchEvents } from '../context/CalendarContext';
import { useAuth } from '../context/AuthContext';
import { parseBuildingLocation } from '../utils/buildingParser';
import { getBuildingCoordinate } from '../utils/buildingCoordinates';
import * as Location from 'expo-location';

// Fixed "now" for all tests: Tuesday Jan 13 2026 at 12:00 local time
jest.mock('../utils/devConfig', () => ({
  DEV_OVERRIDE_TIME: new Date('2026-01-13T12:00:00'),
  DEV_OVERRIDE_LOCATION: null,
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { googleMapsApiKey: 'test-api-key' } },
}));

jest.mock('../context/CalendarContext', () => ({
  useCalendar: jest.fn(),
  fetchEvents: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../utils/buildingParser', () => ({
  parseBuildingLocation: jest.fn(),
}));

jest.mock('../utils/buildingCoordinates', () => ({
  getBuildingCoordinate: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helpers
const mockAccessToken = 'test-access-token';
const mockCalendarId = 'my-calendar@gmail.com';

// An event in the future (13:15 > 12:00)
const futureEvent = {
  id: 'evt-1',
  summary: 'PHYS 468 - Lecture',
  start: { dateTime: '2026-01-13T13:15:00-05:00' },
  end:   { dateTime: '2026-01-13T14:30:00-05:00' },
  location: 'CJ Building 1.129',
  description: 'Loyola Campus',
};

// An event in the past (10:00 < 12:00)
const pastEvent = {
  id: 'evt-0',
  summary: 'PHYS 478 - Lecture',
  start: { dateTime: '2026-01-13T10:00:00-05:00' },
  end:   { dateTime: '2026-01-13T11:00:00-05:00' },
  location: 'CC Building 405',
};

const mockUserLocation: Location.LocationObject = {
  coords: {
    latitude: 45.4971,
    longitude: -73.5789,
    altitude: null,
    accuracy: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

const mockParsed = {
  buildingCode: 'CJ',
  buildingName: 'Communication Studies and Journalism Building',
  room: '1.129',
};

const mockBuildingCoord = { latitude: 45.4576, longitude: -73.6396 };

function setupDefaults() {
  (useCalendar as jest.Mock).mockReturnValue({ selectedCalendarId: mockCalendarId });
  (useAuth as jest.Mock).mockReturnValue({
    getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
  });
  (fetchEvents as jest.Mock).mockResolvedValue([]);
  (parseBuildingLocation as jest.Mock).mockReturnValue(mockParsed);
  (getBuildingCoordinate as jest.Mock).mockReturnValue(mockBuildingCoord);
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      routes: [{ legs: [{ duration: { value: 420 } }] }],
    }),
  });
}

describe('useNextClass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // suppress console.log output from the hook in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    setupDefaults();
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore?.();
  });

  // No calendar selected
  it('returns no_calendar status when selectedCalendarId is null', async () => {
    (useCalendar as jest.Mock).mockReturnValue({ selectedCalendarId: null });

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('no_calendar');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.nextClass).toBeNull();
    });
  });

  // No access token
  it('returns error status when getAccessToken returns null', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      getAccessToken: jest.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Could not retrieve access token.');
    });
  });

  // Upcoming class found
  it('returns found status with parsed class data when a future event exists', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('found');
    });

    const nc = result.current.nextClass!;
    expect(nc).not.toBeNull();
    expect(nc.title).toBe('PHYS 468 - Lecture');  // suffix kept to indicate event type
    expect(nc.buildingCode).toBe('CJ');
    expect(nc.buildingName).toBe('Communication Studies and Journalism Building');
    expect(nc.room).toBe('1.129');
    expect(nc.startTime).toBeInstanceOf(Date);
    expect(nc.endTime).toBeInstanceOf(Date);
    expect(nc.rawLocation).toBe('CJ Building 1.129');
  });

  it('keeps " - Tutorial" suffix in title to indicate event type', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([
      { ...futureEvent, summary: 'COMP 345 - Tutorial' },
    ]);

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.title).toBe('COMP 345 - Tutorial');
  });

  it('keeps " - Lab" suffix in title to indicate event type', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([
      { ...futureEvent, summary: 'ENGR 201 - Lab' },
    ]);

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.title).toBe('ENGR 201 - Lab');
  });

  it('keeps non-type suffix in title unchanged', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([
      { ...futureEvent, summary: 'COMP 345 - Project' },
    ]);

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.title).toBe('COMP 345 - Project');
  });

  // Walking time
  it('fetches walking time when user location and building coordinate are available', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{ legs: [{ duration: { value: 420 } }] }],
      }),
    });

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBe(7); // 420s / 60 = 7 min
  });

  it('sets walkingMinutes to null when user location is null', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBeNull();
  });

  it('sets walkingMinutes to null when getBuildingCoordinate returns null', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);
    (getBuildingCoordinate as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBeNull();
  });

  it('sets walkingMinutes to null when Directions API response is not ok', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBeNull();
  });

  it('sets walkingMinutes to null when Directions API has no routes', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBeNull();
  });

  it('sets walkingMinutes to null when parseBuildingLocation returns null', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([futureEvent]);
    (parseBuildingLocation as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useNextClass(mockUserLocation, 0));

    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.nextClass!.walkingMinutes).toBeNull();
    // buildingCode and name fall back to empty string / raw location
    expect(result.current.nextClass!.buildingCode).toBe('');
  });

  // School day finished (done_today)
  it('returns done_today when all classes for today are in the past', async () => {
    // Single call (startOfDay -> endOfDay) returns only a past event
    (fetchEvents as jest.Mock).mockResolvedValueOnce([pastEvent]);

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('done_today');
      expect(result.current.nextClass).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // No classes today (no_class)
  it('returns no_class when the calendar has no events today', async () => {
    (fetchEvents as jest.Mock).mockResolvedValueOnce([]); // single call returns []

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('no_class');
      expect(result.current.nextClass).toBeNull();
    });
  });

  // fetchEvents throws
  it('returns error status when fetchEvents throws', async () => {
    (fetchEvents as jest.Mock).mockRejectedValue(new Error('Network failure'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Network failure');
    });

    consoleSpy.mockRestore();
  });

  it('sets generic error message when a non-Error is thrown', async () => {
    (fetchEvents as jest.Mock).mockRejectedValue('some string error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNextClass(null, 0));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Unknown error');
    });
    consoleSpy.mockRestore();
  });

  // fetchTrigger forces re-fetch
  it('re-runs the fetch when fetchTrigger changes', async () => {
    (fetchEvents as jest.Mock).mockResolvedValue([futureEvent]);

    const { result, rerender } = renderHook(
      ({ trigger }: { trigger: number }) => useNextClass(null, trigger),
      { initialProps: { trigger: 0 } },
    );

    await waitFor(() => expect(result.current.status).toBe('found'));
    const firstCallCount = (fetchEvents as jest.Mock).mock.calls.length;

    rerender({ trigger: 1 });

    await waitFor(() => {
      expect((fetchEvents as jest.Mock).mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  // Loading state
  it('is initially loading when a calendar is selected', () => {
    // Don't await, check the very first render
    let fetchResolve: (v: any) => void;
    (fetchEvents as jest.Mock).mockReturnValue(
      new Promise((res) => { fetchResolve = res; })
    );
    (useAuth as jest.Mock).mockReturnValue({
      getAccessToken: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
    });

    const { result } = renderHook(() => useNextClass(null, 0));
    expect(result.current.isLoading).toBe(true);
  });
});
