import { UserProfile } from './UserProfile';
import type { Location } from '../strategy/Location';
import type { Route } from '../strategy/Route';

export class Visitor extends UserProfile {
  constructor(name: string, accessibilityNeeds: boolean = false) {
    super(name, accessibilityNeeds);
  }

  requestRoute(_start: Location, _end: Location): Route {
    return {
      duration: 0,
      isIndoor: false,
      isOutdoor: true,
    };
  }
}
