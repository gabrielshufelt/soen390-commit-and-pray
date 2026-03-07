import type { Location } from './Location';
import type { Route } from './Route';

export interface RouteStrategy {
  calculateRoute(start: Location, end: Location): Promise<Route>;
}
