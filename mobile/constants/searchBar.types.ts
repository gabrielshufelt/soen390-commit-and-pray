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

export type SearchBarProps = {
  buildings: BuildingChoice[];

  start: BuildingChoice | null; // null => current location
  destination: BuildingChoice | null;

  onChangeStart: (b: BuildingChoice | null) => void;
  onChangeDestination: (b: BuildingChoice | null) => void;

  transportMode: MapViewDirectionsMode;
  onChangeTransportMode: (mode: MapViewDirectionsMode) => void;

  routeActive: boolean;
  defaultExpanded?: boolean;

  onOpenBuilding?: (b: BuildingChoice) => void;

  onStartRoute?: () => void;
  onPreviewRoute?: () => void;
  onExitPreview?: () => void;
  previewActive?: boolean;

  previewRouteInfo?: {
    distanceText: string | null;
    durationText: string | null;
  };

  /** Controlled: whether the "Use Concordia Shuttle" option is checked. */
  useShuttle?: boolean;
  onUseShuttleChange?: (active: boolean) => void;

  /** Fires whenever the user switches the campus filter (SGW / Loyola). */
  onCampusChange?: (campus: "SGW" | "Loyola") => void;
};