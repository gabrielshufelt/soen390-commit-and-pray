/**
 * useShuttleAvailability
 *
 * Logic-only hook that determines whether the Concordia shuttle is available
 * for the given starting campus at the current (real) time.
 *
 * Rules (from shuttleSchedule.json):
 *  - No service on weekends (Saturday / Sunday).
 *  - Monday–Thursday schedule vs Friday schedule.
 *  - "Available" means at least one departure time is still upcoming today.
 *
 * The hook also exposes the next departure time string so the UI can display it.
 */

import { useMemo } from 'react';
import shuttleData from '../data/shuttleSchedule.json';

export type ShuttleCampus = 'SGW' | 'Loyola';

export interface ShuttleAvailability {
  available: boolean;
  nextDeparture: string | null;
}


/** Strip the trailing asterisk used in schedules for last-bus notes. */
function normalizeTime(raw: string): string {
  return raw.replace('*', '').trim();
}

/**
 * Convert a "HH:MM" string to total minutes since midnight.
 * Returns NaN for invalid input.
 */
export function timeToMinutes(time: string): number {
  const [hStr, mStr] = normalizeTime(time).split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * Return the list of departure strings for today's day-of-week in the given
 * direction.
 *
 * @param fromCampus - Which campus the passenger departs from.
 * @param now        - The date to use (defaults to `new Date()`; injectable for testing).
 */
export function getDepartureTimes(
  fromCampus: ShuttleCampus,
  now: Date = new Date()
): string[] {
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // No weekend service
//   if (day === 0 || day === 6) return [];

  const schedule =
    day === 5
      ? shuttleData.schedules.friday
      : shuttleData.schedules.mondayToThursday;

  return fromCampus === 'Loyola'
    ? schedule.loyolaDepartures  // passenger leaves FROM Loyola → arrives at SGW
    : schedule.sgwDepartures;    // passenger leaves FROM SGW → arrives at Loyola
}

/**
 * Given a list of departure time strings and a current "minutes since midnight"
 * value, return the first departure that is still in the future, or null.
 */
export function findNextDeparture(
  departures: string[],
  nowMinutes: number
): string | null {
  for (const raw of departures) {
    const dep = timeToMinutes(raw);
    if (!isNaN(dep) && dep >= nowMinutes) {
      return normalizeTime(raw);
    }
  }
  return null;
}

/**
 * Returns shuttle availability for a given starting campus, evaluated against
 * the current wall-clock time.
 */
export function useShuttleAvailability(
  fromCampus: ShuttleCampus
): ShuttleAvailability {
  return useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const departures = getDepartureTimes(fromCampus, now);
    const nextDeparture = findNextDeparture(departures, nowMinutes);

    return {
      available: nextDeparture !== null,
      nextDeparture,
    };
  }, [fromCampus]);
}
