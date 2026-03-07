import type { RouteStrategy } from './RouteStrategy';
import type { Location } from './Location';
import type { Route } from './Route';

export class RouteRequest {
  private start: Location;
  private end: Location;
  private strategy: RouteStrategy;

  constructor(start: Location, end: Location, strategy: RouteStrategy) {
    this.start = start;
    this.end = end;
    this.strategy = strategy;
  }

  setStrategy(strategy: RouteStrategy): void {
    this.strategy = strategy;
  }

  async getRoute(): Promise<Route> {
    return this.strategy.calculateRoute(this.start, this.end);
  }
}
