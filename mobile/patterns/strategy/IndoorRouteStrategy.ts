import type { RouteStrategy } from './RouteStrategy';
import type { Location } from './Location';
import type { Route } from './Route';
import type { BuildingPolygon } from './BuildingPolygon';

export class IndoorRouteStrategy implements RouteStrategy {
  private buildingPolygons: BuildingPolygon[];

  constructor(buildingPolygons: BuildingPolygon[]) {
    this.buildingPolygons = buildingPolygons;
  }

  async calculateRoute(_start: Location, _end: Location): Promise<Route> {
    return {
      duration: 0,
      isIndoor: true,
      isOutdoor: false,
    };
  }
}
