import type { MapViewDirectionsMode } from "react-native-maps-directions";

export type BuildingChoice = {
  id: string;
  name: string;
  code?: string;
  address?: string;
  coordinate: { latitude: number; longitude: number };
  campus?: "SGW" | "Loyola";
  category?: "Home" | "Library" | "Favorites";
};

  /** Controlled: whether the "Use Concordia Shuttle" option is checked. */
  useShuttle?: boolean;
  onUseShuttleChange?: (active: boolean) => void;

  /** Fires whenever the user switches the campus filter (SGW / Loyola). */
  onCampusChange?: (campus: "SGW" | "Loyola") => void;
};
