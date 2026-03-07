import type { RouteStrategy } from './RouteStrategy';
import type { Location } from './Location';
import type { Route } from './Route';
import { GoogleMapAPI } from './GoogleMapAPI';

export class OutdoorRouteStrategy implements RouteStrategy {
  private googleMapAPI: GoogleMapAPI;

  constructor(googleMapAPI: GoogleMapAPI) {
    this.googleMapAPI = googleMapAPI;
  }

  async calculateRoute(start: Location, end: Location): Promise<Route> {
    return this.googleMapAPI.getRoute(start, end);
  }
}
