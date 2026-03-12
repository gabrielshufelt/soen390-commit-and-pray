import React from "react";
import MapViewDirections from "react-native-maps-directions";
import { Coordinates } from "../hooks/useDirections";
import { getRouteLineStyle } from "../constants/routeStyles";
import type { MapViewDirectionsMode } from "react-native-maps-directions";

interface ShuttleRouteLegsProps {
  prefix: string;
  origin: Coordinates;
  destination: Coordinates;
  waypoints: [Coordinates, Coordinates];
  transportMode: MapViewDirectionsMode;
  apiKey: string;
  onLeg1Ready?: (result: any) => void;
  onLeg2Ready?: (result: any) => void;
  onLeg3Ready?: (result: any) => void;
  onLeg1Error?: (error: any) => void;
  onLeg2Error?: (error: any) => void;
  onLeg3Error?: (error: any) => void;
}

const ShuttleRouteLegs = React.memo(function ShuttleRouteLegs({
  prefix,
  origin,
  destination,
  waypoints,
  transportMode,
  apiKey,
  onLeg1Ready,
  onLeg2Ready,
  onLeg3Ready,
  onLeg1Error,
  onLeg2Error,
  onLeg3Error,
}: ShuttleRouteLegsProps) {
  return (
    <React.Fragment>
      {/* Leg 1: origin → shuttle departure stop */}
      <MapViewDirections
        key={`${prefix}-leg1-${origin.latitude}-${waypoints[0].latitude}-${transportMode}`}
        origin={origin}
        destination={waypoints[0]}
        apikey={apiKey}
        mode={transportMode}
        {...getRouteLineStyle(transportMode)}
        onReady={onLeg1Ready}
        onError={onLeg1Error}
      />
      {/* Leg 2: shuttle departure stop → arrival stop (shuttle bus) */}
      <MapViewDirections
        key={`${prefix}-leg2-${waypoints[0].latitude}-${waypoints[1].latitude}-${transportMode}`}
        origin={waypoints[0]}
        destination={waypoints[1]}
        apikey={apiKey}
        mode="DRIVING"
        {...getRouteLineStyle("SHUTTLE")}
        onReady={onLeg2Ready}
        onError={onLeg2Error}
      />
      {/* Leg 3: shuttle arrival stop → destination */}
      <MapViewDirections
        key={`${prefix}-leg3-${waypoints[1].latitude}-${destination.latitude}-${transportMode}`}
        origin={waypoints[1]}
        destination={destination}
        apikey={apiKey}
        mode={transportMode}
        {...getRouteLineStyle(transportMode)}
        onReady={onLeg3Ready}
        onError={onLeg3Error}
      />
    </React.Fragment>
  );
});

export default ShuttleRouteLegs;
