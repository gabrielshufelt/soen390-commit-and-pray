import type { Observer } from '../observer/Observer';
import type { CalendarEvent } from '../observer/CalendarEvent';
import type { Location } from '../strategy/Location';
import type { Route } from '../strategy/Route';

export abstract class UserProfile implements Observer {
  name: string;
  accessibilityNeeds: boolean;

  constructor(name: string, accessibilityNeeds: boolean = false) {
    this.name = name;
    this.accessibilityNeeds = accessibilityNeeds;
  }

  viewCampus(): void {
    console.log(`${this.name} is viewing campus`);
  }

  requestRoute(_start: Location, _end: Location): Route {
    return {
      duration: 0,
      isIndoor: false,
      isOutdoor: true,
    };
  }

  update(event: CalendarEvent): void {
    console.log(`${this.name} received event notification: ${event.course}`);
  }
}
