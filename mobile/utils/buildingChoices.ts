import sgwBuildingsData from "../data/buildings/sgw.json";
import loyolaBuildingsData from "../data/buildings/loyola.json";
import { getInteriorPoint } from "./geometry";
import { BuildingChoice } from "../constants/searchBar.types";

const toChoices = (features: any[], campus: "SGW" | "Loyola"): BuildingChoice[] =>
  features.map((b: any) => ({
    id: b.id,
    name: b.properties?.name ?? b.properties?.code ?? "Unknown building",
    code: b.properties?.code,
    coordinate: getInteriorPoint(b.geometry.coordinates[0]),
    campus,
  }));

/** All buildings from both campuses as search choices — static, computed once. */
export const buildingChoices: BuildingChoice[] = [
  ...toChoices(sgwBuildingsData.features, "SGW"),
  ...toChoices(loyolaBuildingsData.features, "Loyola"),
];
