import hFloor1 from "./buildings/H/1-nav.json";
import hFloor2 from "./buildings/H/2-nav.json";
import hFloor8 from "./buildings/H/8-nav.json";
import hFloor9 from "./buildings/H/9-nav.json";
import mbFloorS2 from "./buildings/MB/S2-nav.json";
import mbFloor1 from "./buildings/MB/1-nav.json";
import vlFloor1 from "./buildings/VL/1-nav.json";
import vlFloor2 from "./buildings/VL/2-nav.json";
import ccFloor1 from "./buildings/CC/1-nav.json";

export type IndoorPoint = {
  x: number;
  y: number;
};

export type IndoorRoom = {
  id: string;
  label: string;
  center: IndoorPoint;
  polygon: IndoorPoint[];
};

export type IndoorFloorMap = {
  buildingCode: string;
  floor: number;
  floorLabel: string;
  hallwayPolygon: IndoorPoint[];
  rooms: IndoorRoom[];
};

export type IndoorBuildingMap = {
  buildingCode: string;
  displayName: string;
  floors: IndoorFloorMap[];
};

type IndoorNavNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  label?: string;
};

type IndoorNavData = {
  meta: {
    buildingId: string;
    floor: number;
  };
  nodes: IndoorNavNode[];
};

const BUILDING_LABELS: Record<string, string> = {
  H: "Henry F. Hall",
  MB: "John Molson",
  VL: "Vanier Library",
  CC: "CC Building",
};

function floorLabelFromRaw(raw: string, floorNumber: number): string {
  const normalized = raw.toUpperCase();
  if (normalized.startsWith("S")) return normalized;
  return `${floorNumber}`;
}

function toIndoorFloorMap(rawFloorId: string, nav: IndoorNavData): IndoorFloorMap {
  const roomNodes = nav.nodes.filter((node) => node.type === "room" && (node.label ?? "").trim().length > 0);
  const points = nav.nodes.map((node) => ({ x: node.x, y: node.y }));

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const roomHalfWidth = Math.max(14, Math.round(spanX / 45));
  const roomHalfHeight = Math.max(12, Math.round(spanY / 45));
  const hallwayPaddingX = Math.max(30, Math.round(spanX * 0.06));
  const hallwayPaddingY = Math.max(30, Math.round(spanY * 0.06));

  const rooms = roomNodes
    .map((roomNode) => {
      const cx = roomNode.x;
      const cy = roomNode.y;

      return {
        id: roomNode.id,
        label: roomNode.label?.trim() ?? roomNode.id,
        center: { x: cx, y: cy },
        polygon: [
          { x: cx - roomHalfWidth, y: cy - roomHalfHeight },
          { x: cx + roomHalfWidth, y: cy - roomHalfHeight },
          { x: cx + roomHalfWidth, y: cy + roomHalfHeight },
          { x: cx - roomHalfWidth, y: cy + roomHalfHeight },
        ],
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return {
    buildingCode: nav.meta.buildingId,
    floor: nav.meta.floor,
    floorLabel: floorLabelFromRaw(rawFloorId, nav.meta.floor),
    hallwayPolygon: [
      { x: minX - hallwayPaddingX, y: minY - hallwayPaddingY },
      { x: maxX + hallwayPaddingX, y: minY - hallwayPaddingY },
      { x: maxX + hallwayPaddingX, y: maxY + hallwayPaddingY },
      { x: minX - hallwayPaddingX, y: maxY + hallwayPaddingY },
    ],
    rooms,
  };
}

const indoorMapCatalog: Record<string, Record<string, IndoorNavData>> = {
  H: {
    "1": hFloor1 as IndoorNavData,
    "2": hFloor2 as IndoorNavData,
    "8": hFloor8 as IndoorNavData,
    "9": hFloor9 as IndoorNavData,
  },
  MB: {
    S2: mbFloorS2 as IndoorNavData,
    "1": mbFloor1 as IndoorNavData,
  },
  VL: {
    "1": vlFloor1 as IndoorNavData,
    "2": vlFloor2 as IndoorNavData,
  },
  CC: {
    "1": ccFloor1 as IndoorNavData,
  },
};

export function getSupportedIndoorBuildings(): IndoorBuildingMap[] {
  return Object.entries(indoorMapCatalog)
    .map(([buildingCode, floorsById]) => {
      const floors = Object.entries(floorsById)
        .map(([floorId, nav]) => toIndoorFloorMap(floorId, nav))
        .sort((a, b) => a.floor - b.floor);

      return {
        buildingCode,
        displayName: BUILDING_LABELS[buildingCode] ?? buildingCode,
        floors,
      };
    })
    .sort((a, b) => a.buildingCode.localeCompare(b.buildingCode));
}

export function getBuildingIndoorMap(buildingCode: string): IndoorBuildingMap | null {
  const normalized = buildingCode.toUpperCase().trim();
  const building = getSupportedIndoorBuildings().find((entry) => entry.buildingCode === normalized);
  return building ?? null;
}