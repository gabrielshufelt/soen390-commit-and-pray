import type { Location } from './Location';
import type { Route } from './Route';

export class GoogleMapAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRoute(start: Location, end: Location): Promise<Route> {
    const origin = `${start.xCoordinate},${start.yCoordinate}`;
    const destination = `${end.xCoordinate},${end.yCoordinate}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const leg = data.routes?.[0]?.legs?.[0];
    return {
      duration: leg?.duration?.value ?? 0,
      isIndoor: false,
      isOutdoor: true,
    };
  }
}
