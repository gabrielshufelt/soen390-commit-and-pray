import { useMemo } from "react";
import { isPointInPolygon } from "../utils/geometry";
import sgwBuildingsData from "../data/buildings/sgw.json";
import loyolaBuildingsData from "../data/buildings/loyola.json";

const allBuildings = [
	...sgwBuildingsData.features,
	...loyolaBuildingsData.features,
];

export interface MatchedBuilding {
	id: string;
	name: string;
	code: string;
	coordinates: [number, number][];
	properties: Record<string, any>;
}

/**
 * Given a user location, determines which campus building (if any) the user is inside.
 * Uses the Ray-Casting algorithm from utils/geometry.ts.
 *
 * @param location - The user's current location object (from expo-location), or null.
 * @returns The matched building, or null if the user is not inside any building.
 */
export function useUserBuilding(
	location: { coords: { latitude: number; longitude: number } } | null,
): MatchedBuilding | null {
	return useMemo(() => {
		if (!location) return null;
		return findBuildingForLocation(
			location.coords.latitude,
			location.coords.longitude,
		);
	}, [location?.coords.latitude, location?.coords.longitude]);
}

/**
 * Pure function (also exported for direct use in tests) that finds
 * the building containing the given lat/lng point.
 */
export function findBuildingForLocation(
	latitude: number,
	longitude: number,
): MatchedBuilding | null {
	const point = { latitude, longitude };

	for (const building of allBuildings) {
		const polygon = building.geometry.coordinates[0] as [number, number][];
		if (isPointInPolygon(point, polygon)) {
			const props = building.properties as Record<string, any>;
			return {
				id: building.id,
				name: props.name ?? "Unknown Building",
				code: props.code ?? "",
				coordinates: polygon,
				properties: props,
			};
		}
	}

	return null;
}
