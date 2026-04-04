import type { MapViewDirectionsMode } from "react-native-maps-directions";
import React, { useState } from "react";
import CollapsedSearchBar from "./../components/collapsedSearchBar";
import ExpandedSearchBar from "./../components/expandedSearchBar";
import { BuildingChoice } from "@/constants/searchBar.types"

type Props = {
  readonly buildings: BuildingChoice[];
  readonly roomOptionsByBuilding: Record<string, string[]>;

  readonly start: BuildingChoice | null; // null => current location
  readonly destination: BuildingChoice | null;

  readonly onChangeStart: (b: BuildingChoice | null) => void;
  readonly onChangeDestination: (b: BuildingChoice | null) => void;

  readonly transportMode: MapViewDirectionsMode;
  readonly onChangeTransportMode: (mode: MapViewDirectionsMode) => void;

  readonly routeActive: boolean;
  readonly defaultExpanded?: boolean;

  readonly onOpenBuilding?: (b: BuildingChoice) => void;
  readonly onStartRoute?: () => void;
  readonly onEndRoute?: () => void;
  readonly onPreviewRoute?: () => void;
  readonly onExitPreview?: () => void;
  readonly previewActive?: boolean;

  readonly previewRouteInfo?: {
    readonly distanceText: string | null;
    readonly durationText: string | null;
  };

  readonly useShuttle?: boolean;
  readonly onUseShuttleChange?: (active: boolean) => void;

  readonly onCampusChange?: (campus: "SGW" | "Loyola") => void;
};

export default function SearchBar({
  buildings,
  roomOptionsByBuilding,
  start,
  destination,
  onChangeStart,
  onChangeDestination,
  transportMode,
  onChangeTransportMode,
  routeActive,
  defaultExpanded = false,
  onOpenBuilding,
  onStartRoute,
  onEndRoute,
  onPreviewRoute,
  onExitPreview,
  previewActive = false,
  previewRouteInfo,
  useShuttle = false,
  onUseShuttleChange,
  onCampusChange,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");

  function handleCampusSelect(next: "SGW" | "Loyola") {
    setCampus(next);
    onCampusChange?.(next);
    if (useShuttle) onUseShuttleChange?.(false);
  }

  if (!expanded) {
    return <CollapsedSearchBar onOpen={() => setExpanded(true)} />;
  }

  return (
    <ExpandedSearchBar
      buildings={buildings}
      roomOptionsByBuilding={roomOptionsByBuilding}
      start={start}
      destination={destination}
      onChangeStart={onChangeStart}
      onChangeDestination={onChangeDestination}
      transportMode={transportMode}
      onChangeTransportMode={onChangeTransportMode}
      routeActive={routeActive}
      onOpenBuilding={onOpenBuilding}
      onStartRoute={onStartRoute}
      onEndRoute={onEndRoute}
      onPreviewRoute={onPreviewRoute}
      onExitPreview={onExitPreview}
      previewActive={previewActive}
      previewRouteInfo={previewRouteInfo}
      useShuttle={useShuttle}
      onUseShuttleChange={onUseShuttleChange}
      campus={campus}
      onCampusSelect={handleCampusSelect}
      onClose={() => setExpanded(false)}
    />
  );
}
