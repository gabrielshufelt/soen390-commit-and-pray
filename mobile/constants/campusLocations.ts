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