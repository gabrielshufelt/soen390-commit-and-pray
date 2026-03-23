// buildingCoordinates uses real GeoJSON + geometry (pure math, no native deps)
import { getBuildingCoordinate, getBuildingEntryCoordinates } from '../utils/buildingCoordinates';

describe('getBuildingCoordinate', () => {
  // Known SGW buildings
  it('returns coordinates for Hall Building (H)', () => {
    const result = getBuildingCoordinate('H');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
  });

  it('returns coordinates for MB (JMSB)', () => {
    const result = getBuildingCoordinate('MB');
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeCloseTo(45.495, 1);
  });

  it('returns coordinates for EV building', () => {
    const result = getBuildingCoordinate('EV');
    expect(result).not.toBeNull();
  });

  it('returns coordinates for LB (Library)', () => {
    const result = getBuildingCoordinate('LB');
    expect(result).not.toBeNull();
  });

  // Known Loyola buildings
  it('returns coordinates for CJ (Communication Studies and Journalism)', () => {
    const result = getBuildingCoordinate('CJ');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
  });

  it('returns coordinates for CC (Central Building)', () => {
    const result = getBuildingCoordinate('CC');
    expect(result).not.toBeNull();
  });

  it('returns coordinates for SP (Renaud Science Complex)', () => {
    const result = getBuildingCoordinate('SP');
    expect(result).not.toBeNull();
  });

  // Case-insensitive lookup
  it('is case-insensitive: "h" returns same as "H"', () => {
    expect(getBuildingCoordinate('h')).toEqual(getBuildingCoordinate('H'));
  });

  it('is case-insensitive: "ev" returns same as "EV"', () => {
    expect(getBuildingCoordinate('ev')).toEqual(getBuildingCoordinate('EV'));
  });

  // Unknown codes
  it('returns null for a completely unknown code', () => {
    expect(getBuildingCoordinate('ZZZZZ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getBuildingCoordinate('')).toBeNull();
  });

  // Coordinate sanity checks
  it('SGW campus buildings have latitude near 45.49 and longitude near -73.57', () => {
    const sgwBuildings = ['H', 'MB', 'EV', 'LB', 'GM'];
    for (const code of sgwBuildings) {
      const coord = getBuildingCoordinate(code);
      expect(coord).not.toBeNull();
      expect(coord!.latitude).toBeGreaterThan(45.48);
      expect(coord!.latitude).toBeLessThan(45.51);
      expect(coord!.longitude).toBeGreaterThan(-73.60);
      expect(coord!.longitude).toBeLessThan(-73.56);
    }
  });

  it('Loyola campus buildings have latitude near 45.45 and longitude near -73.64', () => {
    const loyolaBuildings = ['CJ', 'CC', 'SP'];
    for (const code of loyolaBuildings) {
      const coord = getBuildingCoordinate(code);
      expect(coord).not.toBeNull();
      expect(coord!.latitude).toBeGreaterThan(45.45);
      expect(coord!.latitude).toBeLessThan(45.47);
      expect(coord!.longitude).toBeGreaterThan(-73.66);
      expect(coord!.longitude).toBeLessThan(-73.62);
    }
  });
});

describe('getBuildingEntryCoordinates', () => {
  it('returns entry coordinates for Hall Building (H)', () => {
    const result = getBuildingEntryCoordinates('H');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
    expect(result!.latitude).toBeCloseTo(45.497, 1);
    expect(result!.longitude).toBeCloseTo(-73.578, 1);
  });

  it('returns entry coordinates for CC', () => {
    const result = getBuildingEntryCoordinates('CC');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
  });

  it('returns entry coordinates for MB', () => {
    const result = getBuildingEntryCoordinates('MB');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
  });

  it('returns entry coordinates for VL', () => {
    const result = getBuildingEntryCoordinates('VL');
    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
  });

  it('is case-insensitive: "h" returns same as "H"', () => {
    expect(getBuildingEntryCoordinates('h')).toEqual(getBuildingEntryCoordinates('H'));
  });

  it('is case-insensitive: "cc" returns same as "CC"', () => {
    expect(getBuildingEntryCoordinates('cc')).toEqual(getBuildingEntryCoordinates('CC'));
  });

  it('returns null for a completely unknown building code', () => {
    expect(getBuildingEntryCoordinates('ZZZZZ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getBuildingEntryCoordinates('')).toBeNull();
  });

  it('entry coordinates differ from building centroid for H', () => {
    const centroid = getBuildingCoordinate('H');
    const entry = getBuildingEntryCoordinates('H');
    expect(centroid).not.toBeNull();
    expect(entry).not.toBeNull();
    expect(entry).not.toEqual(centroid);
  });

  it('entry coordinates for SGW buildings are within SGW campus bounds', () => {
    const sgwBuildings = ['H', 'MB'];
    for (const code of sgwBuildings) {
      const coord = getBuildingEntryCoordinates(code);
      expect(coord).not.toBeNull();
      expect(coord!.latitude).toBeGreaterThan(45.48);
      expect(coord!.latitude).toBeLessThan(45.51);
      expect(coord!.longitude).toBeGreaterThan(-73.60);
      expect(coord!.longitude).toBeLessThan(-73.56);
    }
  });

  it('entry coordinates for Loyola buildings are within Loyola campus bounds', () => {
    const loyolaBuildings = ['CC', 'VL'];
    for (const code of loyolaBuildings) {
      const coord = getBuildingEntryCoordinates(code);
      expect(coord).not.toBeNull();
      expect(coord!.latitude).toBeGreaterThan(45.43);
      expect(coord!.latitude).toBeLessThan(45.47);
      expect(coord!.longitude).toBeGreaterThan(-73.66);
      expect(coord!.longitude).toBeLessThan(-73.62);
    }
  });
});