export type LatLng = { latitude: number; longitude: number };

export function isValidCoordinate(
    coord: Partial<LatLng> | null | undefined
): coord is LatLng {
    return !!coord && Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude);
}

/**
 * Ray-Casting Algorithm: This determines if a point is inside a polygon.
 * @param point - The user's current latitude and longitude
 * @param polygon - An array of longtitude and latitude (paris from GeoJSON)
*/
export const isPointInPolygon = (
	point: LatLng,
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
 * Calculate the distance from a point to a line segment.
 */
function pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    if (dx === 0 && dy === 0) {
        return Math.hypot(px - x1, py - y1);
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    return Math.hypot(px - closestX, py - closestY);
}

/**
 * Returns a point guaranteed to be inside the polygon.
 * First tries the simple centroid (works for convex polygons).
 * If the centroid falls outside (concave polygons like VA, SP),
 * scans horizontal lines through the polygon to find an interior point.
 *
 * @param polygon - Array of [longitude, latitude] pairs (GeoJSON order)
 */
function distanceToPolygon(lng: number, lat: number, polygon: number[][]): number {
    let minDist = Infinity;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [x1, y1] = polygon[j];
        const [x2, y2] = polygon[i];
        const dist = pointToSegmentDistance(lng, lat, x1, y1, x2, y2);
        if (dist < minDist) minDist = dist;
    }
    
    return minDist;
}

/**
 * Returns a visually centered point inside the polygon using a simplified
 * pole of inaccessibility algorithm. This finds the point furthest from
 * all edges, creating optimal label placement for concave polygons.
 *
 * @param polygon - Array of [longitude, latitude] pairs (GeoJSON order)
 */
/**
 * Computes the centroid of a polygon.
 */
function computeCentroid(polygon: number[][]): { latitude: number; longitude: number } {
    let latSum = 0, lngSum = 0;
    for (const [lng, lat] of polygon) {
        latSum += lat;
        lngSum += lng;
    }
    return { latitude: latSum / polygon.length, longitude: lngSum / polygon.length };
}

/**
 * Computes the bounding box of a polygon.
 */
function computeBoundingBox(polygon: number[][]) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const [lng, lat] of polygon) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    }
    return { minLat, maxLat, minLng, maxLng };
}

/**
 * Searches a grid for the interior point furthest from all polygon edges.
 */
function searchGrid(
    polygon: number[][],
    latStart: number, latEnd: number,
    lngStart: number, lngEnd: number,
    cellSize: number,
    initialBest: { lat: number; lng: number; dist: number }
): { lat: number; lng: number; dist: number } {
    let best = { ...initialBest };
    for (let lat = latStart; lat <= latEnd; lat += cellSize) {
        for (let lng = lngStart; lng <= lngEnd; lng += cellSize) {
            if (!isPointInPolygon({ latitude: lat, longitude: lng }, polygon)) continue;
            const dist = distanceToPolygon(lng, lat, polygon);
            if (dist > best.dist) {
                best = { lat, lng, dist };
            }
        }
    }
    return best;
}

/**
 * Returns a visually centered point inside the polygon using a simplified
 * pole of inaccessibility algorithm.
 */
export const getInteriorPoint = (polygon: number[][]): { latitude: number; longitude: number } => {
    const centroid = computeCentroid(polygon);
    if (isPointInPolygon(centroid, polygon)) return centroid;

    const { minLat, maxLat, minLng, maxLng } = computeBoundingBox(polygon);

    const GRID_DIVISIONS = 20;
    const cellSize = Math.min(maxLat - minLat, maxLng - minLng) / GRID_DIVISIONS;

    // Coarse grid search
    const initialBest = { lat: centroid.latitude, lng: centroid.longitude, dist: 0 };
    const coarseBest = searchGrid(polygon, minLat, maxLat, minLng, maxLng, cellSize, initialBest);

    // Fine grid search around best point
    const REFINEMENT_FACTOR = 4;
    const refineCellSize = cellSize / REFINEMENT_FACTOR;
    const fineBest = searchGrid(
        polygon,
        coarseBest.lat - cellSize, coarseBest.lat + cellSize,
        coarseBest.lng - cellSize, coarseBest.lng + cellSize,
        refineCellSize,
        coarseBest
    );

    return { latitude: fineBest.lat, longitude: fineBest.lng };
};

/**
 * Calculates the Great-circle distance between two points on a sphere (Earth).
 * Used for "Closest Door" logic and outdoor route progress.
 */
export function getDistanceMeters(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculates a minimum tap target radius for small buildings.
 * Returns the buffer radius in degrees needed to create a minimum hit area.
 * This ensures small building polygons have an expanded tappable area.
 * 
 * @param polygon - Array of [longitude, latitude] pairs (GeoJSON order)
 * @param minRadiusDegrees - Minimum tap target radius in degrees (default: 0.0005 ≈ 55m at equator)
 * @returns Radius in degrees if building is smaller than minimum, otherwise 0
 */
export function getMinimumTapTargetBuffer(
    polygon: number[][],
    minRadiusDegrees: number = 0.0005
): number {
    const { minLat, maxLat, minLng, maxLng } = computeBoundingBox(polygon);

    const heightDegrees = maxLat - minLat;
    const widthDegrees = maxLng - minLng;

    const buildingSizeDegrees = Math.max(heightDegrees, widthDegrees);
    
    if (buildingSizeDegrees < minRadiusDegrees * 2) {
        const bufferNeeded = minRadiusDegrees - (buildingSizeDegrees / 2);
        return Math.max(bufferNeeded, minRadiusDegrees * 0.75); 
    }
    
    return 0;
}