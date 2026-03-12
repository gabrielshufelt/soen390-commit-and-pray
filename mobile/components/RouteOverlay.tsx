import React from "react";
import * as Location from "expo-location";
import MapViewDirections from "react-native-maps-directions";
import { DirectionsState, Coordinates } from "../hooks/useDirections";
import { BuildingChoice } from "../constants/searchBar.types";
import { getRouteLineStyle } from "../constants/routeStyles";
import ShuttleRouteLegs from "./ShuttleRouteLegs";
import type { MapViewDirectionsMode } from "react-native-maps-directions";

interface RouteOverlayProps {
  directionsState: DirectionsState;
  startChoice: BuildingChoice | null;
  destChoice: BuildingChoice | null;
  effectiveLocation: Location.LocationObject | null;
  useShuttle: boolean;
  shuttleWaypoints: Coordinates[] | undefined;
  effectiveMode: MapViewDirectionsMode;
  apiKey: string;
  campusKey: string;
  onActiveRouteReady: (result: any) => void;
  onActiveRouteError: (error: any) => void;
  onRoutePreviewReady: (result: any) => void;
  onRouteReady: (result: any) => void;
  onLeg1Error: (error: any) => void;
  onLeg2Error: (error: any) => void;
  onLeg3Error: (error: any) => void;
}

const RouteOverlay = React.memo(function RouteOverlay({
  directionsState,
  startChoice,
  destChoice,
  effectiveLocation,
  useShuttle,
  shuttleWaypoints,
  effectiveMode,
  apiKey,
  campusKey,
  onActiveRouteReady,
  onActiveRouteError,
  onRoutePreviewReady,
  onRouteReady,
  onLeg1Error,
  onLeg2Error,
  onLeg3Error,
}: RouteOverlayProps) {
  const { isActive, origin, destination, transportMode } = directionsState;

  const activeRoute = (() => {
    if (!isActive || !origin || !destination) return null;

    if (useShuttle && shuttleWaypoints) {
      return (
        <ShuttleRouteLegs
          prefix="active"
          origin={origin}
          destination={destination}
          waypoints={[shuttleWaypoints[0], shuttleWaypoints[1]]}
          transportMode={transportMode}
          apiKey={apiKey}
          onLeg1Ready={onRouteReady}
          onLeg1Error={onLeg1Error}
          onLeg2Error={onLeg2Error}
          onLeg3Error={onLeg3Error}
        />
      );
    }

    return (
      <MapViewDirections
        key={`${campusKey}-${origin.latitude}-${destination.latitude}-${effectiveMode}`}
        origin={origin}
        destination={destination}
        apikey={apiKey}
        mode={effectiveMode}
        {...getRouteLineStyle(effectiveMode)}
        onReady={onActiveRouteReady}
        onError={onActiveRouteError}
      />
    );
  })();

  const previewRoute = (() => {
    if (isActive || !destChoice) return null;
    if (!startChoice && !effectiveLocation) return null;

    const origin = startChoice?.coordinate ?? {
      latitude: effectiveLocation!.coords.latitude,
      longitude: effectiveLocation!.coords.longitude,
    };

    if (useShuttle && shuttleWaypoints) {
      return (
        <ShuttleRouteLegs
          prefix="preview"
          origin={origin}
          destination={destChoice.coordinate}
          waypoints={[shuttleWaypoints[0], shuttleWaypoints[1]]}
          transportMode={transportMode}
          apiKey={apiKey}
          onLeg1Ready={onRoutePreviewReady}
          onLeg2Ready={onRoutePreviewReady}
          onLeg3Ready={onRoutePreviewReady}
        />
      );
    }

    return (
      <MapViewDirections
        key={`preview-${origin.latitude}-${destChoice.coordinate.latitude}-${effectiveMode}`}
        origin={origin}
        destination={destChoice.coordinate}
        apikey={apiKey}
        mode={effectiveMode}
        {...getRouteLineStyle(effectiveMode)}
        onReady={onRoutePreviewReady}
      />
    );
  })();

  return (
    <>
      {activeRoute}
      {previewRoute}
    </>
  );
});

export default RouteOverlay;
