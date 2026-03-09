import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface GoogleCalendar {
  id: string;
  summary: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: string;
  description?: string;
}

/**
 * Fetch all events from a specific calendar that fall within the given
 * time window.  Passing "singleEvents=true" tells Google to expand
 * recurring events and honour exclusion dates (EXDATE), so the
 * caller receives individual occurrences.
 */
export async function fetchEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    timeMax,
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar events: ${response.status}`);
  }

  const data = await response.json();
  return (data.items ?? []) as GoogleCalendarEvent[];
}

interface CalendarContextType {
  calendars: GoogleCalendar[];
  selectedCalendarId: string | null;
  isLoadingCalendars: boolean;
  fetchCalendars: (accessToken: string) => Promise<void>;
  selectCalendar: (id: string | null) => Promise<void>;
  clearCalendars: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const SELECTED_CALENDAR_KEY = 'selected_calendar_id';
const CACHED_CALENDARS_KEY = 'cached_calendars';

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Load persisted selection and cached calendar list on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [savedSelection, savedCalendars] = await Promise.all([
          SecureStore.getItemAsync(SELECTED_CALENDAR_KEY),
          SecureStore.getItemAsync(CACHED_CALENDARS_KEY),
        ]);

        if (savedSelection) {
          setSelectedCalendarId(savedSelection);
        }
        if (savedCalendars) {
          setCalendars(JSON.parse(savedCalendars));
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }
    };

    loadPersistedData();
  }, []);

  const fetchCalendars = async (accessToken: string): Promise<void> => {
    // Loading screen
    setIsLoadingCalendars(true); 
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendars: ${response.status}`);
      }

      const data = await response.json();
      const fetchedCalendars: GoogleCalendar[] = (data.items ?? []).map(
        (item: { id: string; summary: string }) => ({
          id: item.id,
          summary: item.summary,
        })
      );

      setCalendars(fetchedCalendars);

      // SecureStore since we're also storing user_data
      await SecureStore.setItemAsync(
        CACHED_CALENDARS_KEY,
        JSON.stringify(fetchedCalendars)
      );
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const selectCalendar = async (id: string | null): Promise<void> => {
    try {
      setSelectedCalendarId(id);
      if (id === null) {
        await SecureStore.deleteItemAsync(SELECTED_CALENDAR_KEY);
      } else {
        // Only allow one calendar to be selected
        await SecureStore.setItemAsync(SELECTED_CALENDAR_KEY, id); 
      }
    } catch (error) {
      console.error('Error saving selected calendar:', error);
    }
  };

  // Clear calendars when user logs out
  const clearCalendars = async (): Promise<void> => {
    try {
      setCalendars([]);
      setSelectedCalendarId(null);
      await Promise.all([
        SecureStore.deleteItemAsync(SELECTED_CALENDAR_KEY),
        SecureStore.deleteItemAsync(CACHED_CALENDARS_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing calendar data:', error);
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        calendars,
        selectedCalendarId,
        isLoadingCalendars,
        fetchCalendars,
        selectCalendar,
        clearCalendars,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): CalendarContextType {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}
