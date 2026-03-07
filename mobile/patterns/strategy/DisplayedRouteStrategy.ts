import type { RouteStrategy } from './RouteStrategy';
import type { Location } from './Location';
import type { Route } from './Route';
import { GoogleMapAPI } from './GoogleMapAPI';

export class DisplayedRouteStrategy implements RouteStrategy {
  private googleMapAPI: GoogleMapAPI;

  constructor(googleMapAPI: GoogleMapAPI) {
    this.googleMapAPI = googleMapAPI;
  }

  async calculateRoute(start: Location, end: Location): Promise<Route> {
    const route = await this.googleMapAPI.getRoute(start, end);
    return { ...route, isOutdoor: true };
  }
}
