 export interface CampusLocation {
  name: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export const CAMPUSES: Record<string, CampusLocation> = {
  SGW: {
    name: 'SGW Campus',
    coordinate: {
      latitude: 45.4948,
      longitude: -73.5779,
    },
    initialRegion: {
      latitude: 45.496054587119566,
      longitude: -73.57794498220551,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
  },
  LOYOLA: {
    name: 'Loyola Campus',
    coordinate: {
      latitude: 45.4581,
      longitude: -73.6391,
    },
    initialRegion: {
      latitude: 45.4581,
      longitude: -73.6391,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
  },
};

// Default campus for initial app load
export const DEFAULT_CAMPUS = 'SGW';


export function findCampusForCoordinate(
  latitude: number,
  longitude: number
): { key: string; campus: CampusLocation } | undefined {
  for (const [key, campus] of Object.entries(CAMPUSES)) {
    const { latitude: centerLat, longitude: centerLng, latitudeDelta, longitudeDelta } = campus.initialRegion;
    
    // Calculate boundaries
    const minLat = centerLat - latitudeDelta / 2;
    const maxLat = centerLat + latitudeDelta / 2;
    const minLng = centerLng - longitudeDelta / 2;
    const maxLng = centerLng + longitudeDelta / 2;
    
    // Check if point is within boundaries
    if (latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng) {
      return { key, campus };
    }
  }
  return undefined;
}
