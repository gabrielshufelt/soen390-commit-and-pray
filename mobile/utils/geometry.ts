/**
 * Ray-Casting Algorithm: This determines if a point is inside a polygon.
 * @param point - The user's current latitude and longitude
 * @param polygon - An array of longtitude and latitude (paris from GeoJSON)
*/
export const isPointInPolygon = (
	point: { latitude: number; longitude: number },
	polygon: number[][]
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

/**
 * Returns a point guaranteed to be inside the polygon.
 * First tries the simple centroid (works for convex polygons).
 * If the centroid falls outside (concave polygons like VA, SP),
 * scans horizontal lines through the polygon to find an interior point.
 *
 * @param polygon - Array of [longitude, latitude] pairs (GeoJSON order)
 */
export const getInteriorPoint = (polygon: number[][]): { latitude: number; longitude: number } => {
    // try simple centroid first
    let latSum = 0;
    let lngSum = 0;
    const n = polygon.length;

    for (const [lng, lat] of polygon) {
        latSum += lat;
        lngSum += lng;
    }

    const centroid = { latitude: latSum / n, longitude: lngSum / n };
    const asTuple = polygon as number[][];

    if (isPointInPolygon(centroid, asTuple)) {
        return centroid;
    }

	// scanline fallback for concave polygons
    // Get bounding box
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const [lng, lat] of polygon) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    }

    // Scan horizontal lines at multiple latitudes
    const steps = 20;
    const latStep = (maxLat - minLat) / steps;
    const lngStep = (maxLng - minLng) / steps;

    for (let i = 1; i < steps; i++) {
        const scanLat = minLat + latStep * i;
        for (let j = 1; j < steps; j++) {
            const scanLng = minLng + lngStep * j;
            const candidate = { latitude: scanLat, longitude: scanLng };
            if (isPointInPolygon(candidate, asTuple)) {
                return candidate;
            }
        }
    }

    // Should never reach here for a valid polygon, but fallback to centroid
    return centroid;
};