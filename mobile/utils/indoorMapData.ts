import type { ImageSourcePropType } from "react-native";

import { CCData } from "../data/buildings/CC";
import { HallData } from "../data/buildings/H";
import { MBData } from "../data/buildings/MB";
import { VLData } from "../data/buildings/VL";

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
      buildFloor(CCData[0] as IndoorNavFile, require("../data/buildings/CC/1.png")),
    ],
  },
  H: {
    buildingId: "H",
    floors: [
      // H Floor 1: SGW campus downtown
      buildFloor(HallData.find(f => f.meta.floor === 1) as IndoorNavFile, require("../data/buildings/H/1.png")),
      // H Floor 2: SGW campus downtown
      buildFloor(HallData.find(f => f.meta.floor === 2) as IndoorNavFile, require("../data/buildings/H/2.png")),
      // H Floor 8: SGW campus downtown
      buildFloor(HallData.find(f => f.meta.floor === 8) as IndoorNavFile, require("../data/buildings/H/8.png")),
      // H Floor 9: SGW campus downtown
      buildFloor(HallData.find(f => f.meta.floor === 9) as IndoorNavFile, require("../data/buildings/H/9.png")),
    ],
  },
  MB: {
    buildingId: "MB",
    floors: [
      // MB Basement S2: JMSB (John Molson School of Business)
      buildFloor(MBData.find(f => f.meta.floor === -2) as IndoorNavFile, require("../data/buildings/MB/S2.png")),
      // MB Floor 1: JMSB
      buildFloor(MBData.find(f => f.meta.floor === 1) as IndoorNavFile, require("../data/buildings/MB/1.png")),
    ],
  },
  VL: {
    buildingId: "VL",
    floors: [
      // VL Floor 1: Loyola campus
      buildFloor(VLData.find(f => f.meta.floor === 1) as IndoorNavFile, require("../data/buildings/VL/1.png")),
      // VL Floor 2: Loyola campus
      buildFloor(VLData.find(f => f.meta.floor === 2) as IndoorNavFile, require("../data/buildings/VL/2.png")),
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

