import type { Subject } from './Subject';
import type { Observer } from './Observer';
import type { CalendarEvent } from './CalendarEvent';

export class Calendar implements Subject {
  private events: CalendarEvent[] = [];
  private observers: Observer[] = [];

  addEvent(event: CalendarEvent): void {
    this.events.push(event);
  }

  getEvents(): CalendarEvent[] {
    return [...this.events];
  }

  subscribe(observer: Observer): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  unsubscribe(observer: Observer): void {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  notify(event: CalendarEvent): void {
    for (const observer of this.observers) {
      observer.update(event);
    }
  }
}
