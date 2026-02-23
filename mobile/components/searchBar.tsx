// ✅ SearchBar.tsx — FINAL (copy-paste whole file)
// Imports CollapsedSearchBar + ExpandedSearchBar

import type { MapViewDirectionsMode } from "react-native-maps-directions";
import React, { useState } from "react";
import CollapsedSearchBar from "./../components/collapsedSearchBar";
import ExpandedSearchBar, { BuildingChoice } from "./../components/expandedSearchBar";

type Props = {
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

  useShuttle?: boolean;
  onUseShuttleChange?: (active: boolean) => void;

  onCampusChange?: (campus: "SGW" | "Loyola") => void;
};

export default function SearchBar({
  buildings,
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
      start={start}
      destination={destination}
      onChangeStart={onChangeStart}
      onChangeDestination={onChangeDestination}
      transportMode={transportMode}
      onChangeTransportMode={onChangeTransportMode}
      routeActive={routeActive}
      onOpenBuilding={onOpenBuilding}
      onStartRoute={onStartRoute}
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