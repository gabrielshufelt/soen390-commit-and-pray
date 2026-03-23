import { ROUTE_LINE_STYLES, getRouteLineStyle } from '../constants/routeStyles';
import type { MapViewDirectionsMode } from 'react-native-maps-directions';

describe('routeStyles', () => {
    describe('ROUTE_LINE_STYLES', () => {
        it('defines a style for every standard transport mode and SHUTTLE', () => {
            const expectedKeys: (MapViewDirectionsMode | 'SHUTTLE')[] = [
                'DRIVING',
                'WALKING',
                'BICYCLING',
                'TRANSIT',
                'SHUTTLE',
            ];

            expectedKeys.forEach((key) => {
                expect(ROUTE_LINE_STYLES[key]).toBeDefined();
                expect(ROUTE_LINE_STYLES[key].strokeColor).toEqual(expect.any(String));
                expect(ROUTE_LINE_STYLES[key].strokeWidth).toEqual(expect.any(Number));
            });
        });

        it('uses a solid line (no dash pattern) for DRIVING', () => {
            expect(ROUTE_LINE_STYLES.DRIVING.lineDashPattern).toBeUndefined();
        });

        it('uses a dotted line for WALKING', () => {
            expect(ROUTE_LINE_STYLES.WALKING.lineDashPattern).toBeDefined();
            expect(Array.isArray(ROUTE_LINE_STYLES.WALKING.lineDashPattern)).toBe(true);
            expect(ROUTE_LINE_STYLES.WALKING.lineDashPattern!.length).toBeGreaterThan(0);
        });

        it('uses a dashed line for BICYCLING', () => {
            expect(ROUTE_LINE_STYLES.BICYCLING.lineDashPattern).toBeDefined();
            expect(Array.isArray(ROUTE_LINE_STYLES.BICYCLING.lineDashPattern)).toBe(true);
            expect(ROUTE_LINE_STYLES.BICYCLING.lineDashPattern!.length).toBeGreaterThan(0);
        });

        it('uses a solid line for TRANSIT', () => {
            expect(ROUTE_LINE_STYLES.TRANSIT.lineDashPattern).toBeUndefined();
        });

        it('uses a solid line for SHUTTLE', () => {
            expect(ROUTE_LINE_STYLES.SHUTTLE.lineDashPattern).toBeUndefined();
        });

        it('uses distinct visual styles (color or dash pattern) for each transport mode', () => {
            // WALKING and DRIVING share a color but are differentiated by dash pattern
            const entries = Object.entries(ROUTE_LINE_STYLES);
            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const [keyA, a] = entries[i];
                    const [keyB, b] = entries[j];
                    const sameColor = a.strokeColor === b.strokeColor;
                    const sameDash = JSON.stringify(a.lineDashPattern) === JSON.stringify(b.lineDashPattern);
                    expect(sameColor && sameDash).toBe(false);
                }
            }
        });

        it('WALKING has a shorter dash than BICYCLING (dotted vs dashed)', () => {
            const walkDash = ROUTE_LINE_STYLES.WALKING.lineDashPattern!;
            const bikeDash = ROUTE_LINE_STYLES.BICYCLING.lineDashPattern!;
            expect(walkDash[0]).toBeLessThan(bikeDash[0]);
        });
    });

    describe('getRouteLineStyle', () => {
        it('returns the correct style for a known mode', () => {
            expect(getRouteLineStyle('WALKING')).toBe(ROUTE_LINE_STYLES.WALKING);
            expect(getRouteLineStyle('DRIVING')).toBe(ROUTE_LINE_STYLES.DRIVING);
            expect(getRouteLineStyle('SHUTTLE')).toBe(ROUTE_LINE_STYLES.SHUTTLE);
        });

        it('falls back to DRIVING for an unknown mode', () => {
            // @ts-ignore – intentionally passing an invalid mode
            expect(getRouteLineStyle('UNKNOWN_MODE')).toBe(ROUTE_LINE_STYLES.DRIVING);
        });
    });
});
