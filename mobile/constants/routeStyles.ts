import type { MapViewDirectionsMode } from 'react-native-maps-directions';

/**
 * - Driving:  solid blue line
 * - Walking:  dotted blue line
 * - Cycling:  dashed orange line
 * - Transit:  solid purple line
 * - Shuttle:  solid red line (bus leg between campuses)
 */
export interface RouteLineStyle {
    strokeColor: string;
    strokeWidth: number;
    lineDashPattern?: number[];
}

export const ROUTE_LINE_STYLES: Record<MapViewDirectionsMode | 'SHUTTLE', RouteLineStyle> = {
    DRIVING: {
        strokeColor: '#2196F3',
        strokeWidth: 5,
    },
    WALKING: {
        strokeColor: '#2196F3',
        strokeWidth: 3,
        lineDashPattern: [1, 4],
    },
    BICYCLING: {
        strokeColor: '#FF9800',
        strokeWidth: 3,
        lineDashPattern: [10, 7],
    },
    TRANSIT: {
        strokeColor: '#9C27B0',
        strokeWidth: 5,
    },
    SHUTTLE: {
        strokeColor: '#D32F2F',
        strokeWidth: 5,
    },
};

/**
 * Convenience helper – returns the style object for a given transport mode.
 * Falls back to DRIVING if the mode is unrecognised.
 */
export function getRouteLineStyle(mode: MapViewDirectionsMode | 'SHUTTLE'): RouteLineStyle {
    return ROUTE_LINE_STYLES[mode] ?? ROUTE_LINE_STYLES.DRIVING;
}
