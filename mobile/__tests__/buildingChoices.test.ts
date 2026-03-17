import { toChoices, buildingChoices } from '../utils/buildingChoices';

jest.mock('../utils/geometry', () => ({
  getInteriorPoint: jest.fn((coords: any) => ({ latitude: 45.0, longitude: -73.0 })),
}));

describe('toChoices', () => {
  it('uses name when present', () => {
    const features = [
      { id: '1', properties: { name: 'Hall Building', code: 'H' }, geometry: { coordinates: [[[0, 0]]] } },
    ];
    const result = toChoices(features, 'SGW');
    expect(result[0].name).toBe('Hall Building');
  });

  it('falls back to code when name is absent', () => {
    const features = [
      { id: '2', properties: { code: 'MB' }, geometry: { coordinates: [[[0, 0]]] } },
    ];
    const result = toChoices(features, 'SGW');
    expect(result[0].name).toBe('MB');
  });

  it('falls back to "Unknown building" when both name and code are absent', () => {
    const features = [
      { id: '3', properties: {}, geometry: { coordinates: [[[0, 0]]] } },
    ];
    const result = toChoices(features, 'Loyola');
    expect(result[0].name).toBe('Unknown building');
  });

  it('sets campus and coordinate on each choice', () => {
    const features = [
      { id: '4', properties: { name: 'Test', code: 'T' }, geometry: { coordinates: [[[0, 0]]] } },
    ];
    const result = toChoices(features, 'Loyola');
    expect(result[0].campus).toBe('Loyola');
    expect(result[0].coordinate).toEqual({ latitude: 45.0, longitude: -73.0 });
  });
});

describe('buildingChoices', () => {
  it('contains entries from both SGW and Loyola campuses', () => {
    const sgw = buildingChoices.filter(b => b.campus === 'SGW');
    const loyola = buildingChoices.filter(b => b.campus === 'Loyola');
    expect(sgw.length).toBeGreaterThan(0);
    expect(loyola.length).toBeGreaterThan(0);
  });

  it('every entry has an id, coordinate, and campus', () => {
    for (const choice of buildingChoices) {
      expect(choice.id).toBeTruthy();
      expect(choice.coordinate.latitude).toBeDefined();
      expect(choice.coordinate.longitude).toBeDefined();
      expect(['SGW', 'Loyola']).toContain(choice.campus);
    }
  });
});
