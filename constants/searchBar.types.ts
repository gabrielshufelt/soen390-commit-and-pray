import type { MapViewDirectionsMode } from "react-native-maps-directions";

export type BuildingChoice = {
  id: string;
  name: string;
  code?: string;
  room?: string;
  address?: string;
  coordinate: { latitude: number; longitude: number };
  campus?: "SGW" | "Loyola";
  category?: "Home" | "Library" | "Favorites";
};
