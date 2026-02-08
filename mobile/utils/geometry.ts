/**
 * Ray-Casting Algorithm: This determines if a point is inside a polygon.
 * @param point - The user's current latitude and longitude
 * @param polygon - An array of longtitude and latitude (paris from GeoJSON)
*/
export const isPointInPolygon = (
	point: { latitude: number; longitude: number },
	polygon: [number, number][]
) => {
	const { latitude: ptLat, longitude: ptLng } = point;
	let isInside = false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];

		const intersect = ((yi > ptLat) !== (yj > ptLat)) &&
			(ptLng < (xj - xi) * (ptLat - yi) / (yj - yi) + xi);
		
		if (intersect) isInside = !isInside;
	}

	return isInside;
};

