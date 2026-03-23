import {
  getBuildingIndoorGraphData,
  getBuildingIndoorMap,
  getFloorLabel,
  getIndoorBuildingCodes,
} from '../utils/indoorMapData';

describe('indoorMapData', () => {
  it('returns a building map for known codes and is case-insensitive', () => {
    const upper = getBuildingIndoorMap('H');
    const lower = getBuildingIndoorMap('h');

    expect(upper).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(lower).toEqual(upper);
  });

  it('returns null for unknown building code', () => {
    expect(getBuildingIndoorMap('UNKNOWN')).toBeNull();
    expect(getBuildingIndoorGraphData('UNKNOWN')).toBeNull();
  });

  it('returns graph data for known building codes and is case-insensitive', () => {
    const upper = getBuildingIndoorGraphData('H');
    const lower = getBuildingIndoorGraphData('h');

    expect(upper).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(lower).toEqual(upper);
    expect(upper!.length).toBeGreaterThan(0);
    expect(upper![0].nodes.length).toBeGreaterThan(0);
    expect(upper![0].edges.length).toBeGreaterThan(0);
  });

  it('returns known indoor building codes', () => {
    const codes = getIndoorBuildingCodes();

    expect(codes).toEqual(expect.arrayContaining(['CC', 'H', 'MB', 'VL']));
  });

  it('returns floors sorted ascending for multi-floor buildings', () => {
    const hMap = getBuildingIndoorMap('H');

    expect(hMap).not.toBeNull();
    const floors = hMap!.floors.map((floor) => floor.floor);
    const sorted = [...floors].sort((a, b) => a - b);

    expect(floors).toEqual(sorted);
  });

  it('orders MB basement floor before floor 1', () => {
    const mbMap = getBuildingIndoorMap('MB');

    expect(mbMap).not.toBeNull();
    expect(mbMap!.floors.map((floor) => floor.floor)).toEqual([-2, 1]);
  });

  it('uses the expected default canvas dimensions for all floor maps', () => {
    const codes = getIndoorBuildingCodes();

    for (const code of codes) {
      const map = getBuildingIndoorMap(code);
      expect(map).not.toBeNull();

      for (const floor of map!.floors) {
        expect(floor.canvasWidth).toBe(2048);
        expect(floor.canvasHeight).toBe(2048);
      }
    }
  });

  it('formats floor labels for basement, ground, and regular floors', () => {
    expect(getFloorLabel(-2)).toBe('S2');
    expect(getFloorLabel(0)).toBe('G');
    expect(getFloorLabel(1)).toBe('1');
    expect(getFloorLabel(9)).toBe('9');
  });
});
