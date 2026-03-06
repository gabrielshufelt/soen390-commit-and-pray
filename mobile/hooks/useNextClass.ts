import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

import { useCalendar, fetchEvents, GoogleCalendarEvent } from '../context/CalendarContext';
import { useAuth } from '../context/AuthContext';
import { parseBuildingLocation } from '../utils/buildingParser';
import { getBuildingCoordinate } from '../utils/buildingCoordinates';
import { DEV_OVERRIDE_TIME } from '../utils/devConfig';

// DEVELOPPER CONFIG
// Controls what shows when there are NO classes at all today (free day).
// 'hide': modal disappears entirely
// 'show_message': shows a "No classes today" card
export const NO_CLASS_BEHAVIOR: 'show_message' | 'hide' = 'show_message';

export type NextClassStatus =
  | 'found'
  | 'done_today'
  | 'no_class'
  | 'no_calendar'
  | 'loading'
  | 'error';

export interface ParsedNextClass {
  title: string; // Title ex: "COMP 345"
  buildingCode: string; // Concordia building code ex: "H"
  buildingName: string; // Full building name ex: "Henry F. Hall Building"
  room: string; // Room number ex "820" or "1.129"
  startTime: Date; // class start as js date
  endTime: Date; // class end time as js date
  walkingMinutes: number | null; // estimated walking time in min, null if location is unavailable or API call fails
  rawLocation: string; // raw location from calendar event for debugging
}

export interface UseNextClassResult {
  nextClass: ParsedNextClass | null;
  status: NextClassStatus;
  isLoading: boolean;
  error: string | null;
}

// Walking time via Google Directions REST API
async function fetchWalkingMinutes(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  apiKey: string,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'walking',
      key: apiKey,
    });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    const leg = data.routes?.[0]?.legs?.[0];
    if (!leg) return null;

    // Duration is in seconds
    return Math.round(leg.duration.value / 60);
  } catch {
    return null;
  }
}


/**
 * Fetches today's calendar events for the user's selected calendar and returns
 * the next upcoming class along with walking time from the user's position.
 */
export function useNextClass(
  userLocation: Location.LocationObject | null, // can be overriden by DEV_OVERRIDE_LOCATION for testing
  fetchTrigger: number, // increment to force re-fetch (e.g. on screen focus)
): UseNextClassResult {
  const { selectedCalendarId } = useCalendar();
  const { getAccessToken } = useAuth();
  const apiKey: string = (Constants.expoConfig?.extra?.googleMapsApiKey as string) ?? '';

  const [nextClass, setNextClass] = useState<ParsedNextClass | null>(null);
  const [status, setStatus] = useState<NextClassStatus>(
    selectedCalendarId ? 'loading' : 'no_calendar',
  );
  const [isLoading, setIsLoading] = useState(!!selectedCalendarId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No calendar selected: nothing to fetch
    if (!selectedCalendarId) {
      setNextClass(null);
      setStatus('no_calendar');
      setIsLoading(false);
      setError(null);
      console.log('[useNextClass] No calendar selected.');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      console.log('[useNextClass] Fetching events...');

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!cancelled) {
            setStatus('error');
            setError('Could not retrieve access token.');
            setIsLoading(false);
            console.log('[useNextClass] No access token.');
          }
          return;
        }

        // "Now": use dev override when set, otherwise real clock
        const now = DEV_OVERRIDE_TIME ? new Date(DEV_OVERRIDE_TIME) : new Date();
        console.log('[useNextClass] now =', now.toISOString(), '| calendarId =', selectedCalendarId);

        // Today's window: from now until midnight tonight
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const events: GoogleCalendarEvent[] = await fetchEvents(
          accessToken,
          selectedCalendarId,
          now.toISOString(),
          endOfDay.toISOString(),
        );
        console.log('[useNextClass] Events from API (timeMin→endOfDay):', events.length, events.map(e => e.summary + ' @ ' + e.start?.dateTime));

        if (cancelled) return;

        // Determine next upcoming event
        // fetchEvents already orders by startTime and uses timeMin=now, BUT
        // Google may include events already in progress (startTime < now).
        // Filter strictly to future events.
        const upcoming = events.filter(
          (e) => e.start?.dateTime && new Date(e.start.dateTime) > now,
        );

        if (upcoming.length === 0) {
          // Check whether there were ANY events today (all past) vs none at all
          // by re-querying from start of day
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);

          const allToday: GoogleCalendarEvent[] = await fetchEvents(
            accessToken,
            selectedCalendarId,
            startOfDay.toISOString(),
            endOfDay.toISOString(),
          );

          if (cancelled) return;

          if (allToday.length > 0) {
            // There were classes today but they are all done
            setNextClass(null);
            setStatus('done_today');
            console.log('[useNextClass] Status: done_today');
          } else {
            // Completely free day
            setNextClass(null);
            setStatus('no_class');
            console.log('[useNextClass] Status: no_class');
          }
          setIsLoading(false);
          return;
        }

        // Parse soonest event
        const event = upcoming[0];
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);

        const rawLocation = event.location ?? '';
        const parsed = parseBuildingLocation(rawLocation);

        // Walking time
        let walkingMinutes: number | null = null;
        if (userLocation && parsed && apiKey) {
          const buildingCoord = getBuildingCoordinate(parsed.buildingCode);
          if (buildingCoord) {
            walkingMinutes = await fetchWalkingMinutes(
              {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              },
              buildingCoord,
              apiKey,
            );
          }
        }

        if (cancelled) return;

        // Extract a clean title: strip the " - Lecture" / " - Tutorial" suffixes
        // common in Concordia ICS exports, e.g. "PHYS 468 - Lecture" → "PHYS 468"
        const title = event.summary.replace(/\s*-\s*(Lecture|Tutorial|Lab|Seminar|Workshop)$/i, '').trim();

        setNextClass({
          title,
          buildingCode: parsed?.buildingCode ?? '',
          buildingName: parsed?.buildingName ?? rawLocation,
          room: parsed?.room ?? '',
          startTime,
          endTime,
          walkingMinutes,
          rawLocation,
        });
        setStatus('found');
        console.log('[useNextClass] Status: found |', title, '| building:', parsed?.buildingCode, parsed?.room, '| walk:', walkingMinutes, 'min');
      } catch (err) {
        if (!cancelled) {
          console.error('[useNextClass] Error:', err);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };

    // fetchTrigger is intentionally in the dependency array to allow forced re-fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarId, fetchTrigger]);

  return { nextClass, status, isLoading, error };
}
