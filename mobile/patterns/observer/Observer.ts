import type { CalendarEvent } from './CalendarEvent';

export interface Observer {
  update(event: CalendarEvent): void;
}
