import type { CalendarEvent } from './CalendarEvent';

export interface Subject {
  notify(event: CalendarEvent): void;
}
