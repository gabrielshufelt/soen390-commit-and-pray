import type { ImageSourcePropType } from "react-native";

import ccFloor1Nav from "../data/buildings/CC/1-nav.json";
import hFloor1Nav from "../data/buildings/H/1-nav.json";
import hFloor2Nav from "../data/buildings/H/2-nav.json";
import hFloor8Nav from "../data/buildings/H/8-nav.json";
import hFloor9Nav from "../data/buildings/H/9-nav.json";
import mbFloor1Nav from "../data/buildings/MB/1-nav.json";
import mbFloorS2Nav from "../data/buildings/MB/S2-nav.json";
import vlFloor1Nav from "../data/buildings/VL/1-nav.json";
import vlFloor2Nav from "../data/buildings/VL/2-nav.json";

/**
 * INDOOR FLOOR MAP CALIBRATION GUIDE:
 *
 * Each floor can be calibrated to match room markers with the floor image.
 * Pass a calibration object as the 3rd argument to buildFloor():
 *
 * Example:
 *   buildFloor(mbFloor1Nav, require("path/to/image.png"), {
 *     offsetX: 50,    // shift right by 50px
 *     offsetY: -30,   // shift up by 30px
 *     scaleX: 1.05,   // stretch horizontally by 5%
 *     scaleY: 0.98,   // compress vertically by 2%
 *   })
 *
 * How to calibrate:
 * 1. Enable DEV_OVERRIDE_LOCATION in devConfig.ts for a building
 * 2. Open the Indoor button → tap the floor you're calibrating
 * 3. Check if room markers align with actual rooms on the image
 * 4. Adjust the calibration object and reload to retest
 * 5. Once perfect, the calibration persists in this file
 *
 * Canvas size: All floors use 2048x2048 coordinate space
 */

export type IndoorNode = {
  id: string;
  type: string;
  buildingId: string;
  floor: number;
  x: number;
  y: number;
  label: string;
  accessible: boolean;
};

export type IndoorFloorMap = {
  floor: number;
  image: ImageSourcePropType;
  nodes: IndoorNode[];
  // Indoor nav node coordinates are authored against this canvas size.
  canvasWidth: number;
  canvasHeight: number;
  // Calibration lets us nudge a floor image without touching nav data.
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
};

export type IndoorBuildingMap = {
  buildingId: string;
  floors: IndoorFloorMap[];
};

type IndoorNavFile = {
  meta: {
    buildingId: string;
    floor: number;
  };
  nodes: IndoorNode[];
};

const DEFAULT_CANVAS_SIZE = 2048;

const buildFloor = (
  nav: IndoorNavFile,
  image: ImageSourcePropType,
  calibration?: {
    offsetX?: number;
    offsetY?: number;
    scaleX?: number;
    scaleY?: number;
  }
): IndoorFloorMap => ({
  floor: nav.meta.floor,
  image,
  nodes: nav.nodes,
  canvasWidth: DEFAULT_CANVAS_SIZE,
  canvasHeight: DEFAULT_CANVAS_SIZE,
  offsetX: calibration?.offsetX ?? 0,
  offsetY: calibration?.offsetY ?? 0,
  scaleX: calibration?.scaleX ?? 1,
  scaleY: calibration?.scaleY ?? 1,
});

const INDOOR_BUILDING_MAPS: Record<string, IndoorBuildingMap> = {
  CC: {
    buildingId: "CC",
    floors: [
      // CC Floor 1: Loyola CJ campus
      buildFloor(ccFloor1Nav as IndoorNavFile, require("../data/buildings/CC/1.png")),
    ],
  },
  H: {
    buildingId: "H",
    floors: [
      // H Floor 1: SGW campus downtown
      buildFloor(hFloor1Nav as IndoorNavFile, require("../data/buildings/H/1.png")),
      // H Floor 2: SGW campus downtown
      buildFloor(hFloor2Nav as IndoorNavFile, require("../data/buildings/H/2.png")),
      // H Floor 8: SGW campus downtown
      buildFloor(hFloor8Nav as IndoorNavFile, require("../data/buildings/H/8.png")),
      // H Floor 9: SGW campus downtown
      buildFloor(hFloor9Nav as IndoorNavFile, require("../data/buildings/H/9.png")),
    ],
  },
  MB: {
    buildingId: "MB",
    floors: [
      // MB Basement S2: JMSB (John Molson School of Business)
      buildFloor(mbFloorS2Nav as IndoorNavFile, require("../data/buildings/MB/S2.png")),
      // MB Floor 1: JMSB
      buildFloor(mbFloor1Nav as IndoorNavFile, require("../data/buildings/MB/1.png")),
    ],
  },
  VL: {
    buildingId: "VL",
    floors: [
      // VL Floor 1: Loyola campus
      buildFloor(vlFloor1Nav as IndoorNavFile, require("../data/buildings/VL/1.png")),
      // VL Floor 2: Loyola campus
      buildFloor(vlFloor2Nav as IndoorNavFile, require("../data/buildings/VL/2.png")),
    ],
  },
};

for (const building of Object.values(INDOOR_BUILDING_MAPS)) {
  building.floors.sort((a, b) => a.floor - b.floor);
}

export const getBuildingIndoorMap = (buildingCode: string): IndoorBuildingMap | null => {
  const normalized = buildingCode.toUpperCase();
  return INDOOR_BUILDING_MAPS[normalized] ?? null;
};

export const getIndoorBuildingCodes = (): string[] => {
  return Object.keys(INDOOR_BUILDING_MAPS);
};

export const getFloorLabel = (floor: number): string => {
  if (floor < 0) {
    return `S${Math.abs(floor)}`;
  }
  if (floor === 0) {
    return "G";
  }
  return `${floor}`;
};

/**
 * Debug helper: Returns calibration status for all floors.
 * Useful for checking which floors have been calibrated.
 */
export const getCalibrationStatus = (): Array<{
  building: string;
  floor: string;
  calibrated: boolean;
  offset: { x: number; y: number };
  scale: { x: number; y: number };
}> => {
  const status: Array<{
    building: string;
    floor: string;
    calibrated: boolean;
    offset: { x: number; y: number };
    scale: { x: number; y: number };
  }> = [];

  for (const [buildingCode, building] of Object.entries(INDOOR_BUILDING_MAPS)) {
    for (const floorMap of building.floors) {
      const hasOffsetOrScale =
        (floorMap.offsetX !== 0 && floorMap.offsetX !== undefined) ||
        (floorMap.offsetY !== 0 && floorMap.offsetY !== undefined) ||
        (floorMap.scaleX !== 1 && floorMap.scaleX !== undefined) ||
        (floorMap.scaleY !== 1 && floorMap.scaleY !== undefined);

      status.push({
        building: buildingCode,
        floor: getFloorLabel(floorMap.floor),
        calibrated: hasOffsetOrScale,
        offset: { x: floorMap.offsetX ?? 0, y: floorMap.offsetY ?? 0 },
        scale: { x: floorMap.scaleX ?? 1, y: floorMap.scaleY ?? 1 },
      });
    }
  }

  return status;
};
