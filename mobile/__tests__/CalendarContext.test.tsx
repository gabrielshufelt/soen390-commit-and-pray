import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react-native';
import { CalendarProvider, useCalendar, GoogleCalendar } from '../context/CalendarContext';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockCalendars: GoogleCalendar[] = [
  { id: 'calendar-1', summary: 'University Schedule' },
  { id: 'calendar-2', summary: 'Personal' },
  { id: 'calendar-3', summary: 'Engineering Club' },
];

const mockFetch = jest.fn();
global.fetch = mockFetch;

function wrapper({ children }: { children: React.ReactNode }) {
  return <CalendarProvider>{children}</CalendarProvider>;
}

describe('CalendarContext', () => {
  beforeEach(() => {
    // resetAllMocks clears both calls AND implementations so mockImplementation
    // set in one test doesn't bleed into the next.
    jest.resetAllMocks();

    // Re-apply default SecureStore stubs (return null by default)
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockCalendars }),
    });
  });

  it('provides default empty state', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => {
      expect(result.current.calendars).toEqual([]);
      expect(result.current.selectedCalendarId).toBeNull();
      expect(result.current.isLoadingCalendars).toBe(false);
    });
  });

  it('loads persisted selected calendar ID from SecureStore on mount', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key === 'selected_calendar_id') return Promise.resolve('calendar-2');
      if (key === 'cached_calendars') return Promise.resolve(JSON.stringify(mockCalendars));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedCalendarId).toBe('calendar-2');
      expect(result.current.calendars).toEqual(mockCalendars);
    });
  });

  it('fetchCalendars populates the calendars list', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('test-access-token');
    });

    expect(result.current.calendars).toEqual(mockCalendars);
    expect(result.current.isLoadingCalendars).toBe(false);
  });

  it('fetchCalendars calls the correct Google Calendar API endpoint with Authorization header', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('my-token-123');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: 'Bearer my-token-123' } }
    );
  });

  it('fetchCalendars caches results in SecureStore', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('test-access-token');
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'cached_calendars',
      JSON.stringify(mockCalendars)
    );
  });

  it('selectCalendar updates selectedCalendarId and persists to SecureStore', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.selectCalendar('calendar-1');
    });

    expect(result.current.selectedCalendarId).toBe('calendar-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'selected_calendar_id',
      'calendar-1'
    );
  });

  it('selectCalendar with null clears selection and removes from SecureStore', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.selectCalendar('calendar-1');
    });

    await act(async () => {
      await result.current.selectCalendar(null);
    });

    expect(result.current.selectedCalendarId).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('selected_calendar_id');
  });

  it('selecting a different calendar replaces the previous selection', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.selectCalendar('calendar-1');
    });

    expect(result.current.selectedCalendarId).toBe('calendar-1');

    await act(async () => {
      await result.current.selectCalendar('calendar-3');
    });

    expect(result.current.selectedCalendarId).toBe('calendar-3');
  });

  it('clearCalendars resets all state and removes from SecureStore', async () => {
    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('test-access-token');
    });

    await act(async () => {
      await result.current.selectCalendar('calendar-2');
    });

    await act(async () => {
      await result.current.clearCalendars();
    });

    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarId).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('selected_calendar_id');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cached_calendars');
  });

  it('throws when useCalendar is used outside CalendarProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCalendar())).toThrow(
      'useCalendar must be used within a CalendarProvider'
    );
    consoleSpy.mockRestore();
  });

  it('handles SecureStore error gracefully during initial data load', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
      new Error('Storage read error')
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useCalendar(), { wrapper });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading calendar data:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('handles non-ok HTTP response from Google Calendar API', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('bad-token');
    });

    expect(result.current.calendars).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching calendars:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('handles network error during fetchCalendars', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.fetchCalendars('test-token');
    });

    expect(result.current.calendars).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching calendars:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('handles SecureStore error gracefully during selectCalendar', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
      new Error('Write error')
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.selectCalendar('calendar-1');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving selected calendar:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('handles SecureStore error gracefully during clearCalendars', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
      new Error('Delete error')
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCalendar(), { wrapper });

    await act(async () => {
      await result.current.clearCalendars();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error clearing calendar data:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
