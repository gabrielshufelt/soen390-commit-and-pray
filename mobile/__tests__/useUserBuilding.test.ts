import { renderHook } from '@testing-library/react-native';
import { useUserBuilding, findBuildingForLocation } from '../hooks/useUserBuilding';

describe('findBuildingForLocation', () => {
  it('returns null for a point outside all buildings', () => {
    const result = findBuildingForLocation(0, 0);
    expect(result).toBeNull();
  });

  it('returns a building when point is inside a polygon', () => {
    // Use a known coordinate inside the Hall Building (H) on SGW campus
    // H building is roughly at 45.4973, -73.5790
    const result = findBuildingForLocation(45.49726, -73.57888);
    expect(result).not.toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.name).toBeDefined();
    expect(result!.coordinates).toBeDefined();
  });

  it('includes name and code from building properties', () => {
    const result = findBuildingForLocation(45.49726, -73.57888);
    if (result) {
      expect(typeof result.name).toBe('string');
      expect(typeof result.code).toBe('string');
      expect(result.properties).toBeDefined();
    }
  });

  it('defaults code to empty string for buildings without a code', () => {
    // Concordia Vanier Library has no code property
    const result = findBuildingForLocation(45.45901, -73.63852);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('');
    expect(result!.name).toBe('Concordia Vanier Library');
  });
});

describe('useUserBuilding', () => {
  it('returns null when location is null', () => {
    const { result } = renderHook(() => useUserBuilding(null));
    expect(result.current).toBeNull();
  });

  it('returns null when outside all buildings', () => {
    const location = { coords: { latitude: 0, longitude: 0 } };
    const { result } = renderHook(() => useUserBuilding(location));
    expect(result.current).toBeNull();
  });

  it('returns building when inside a building polygon', () => {
    const location = { coords: { latitude: 45.49726, longitude: -73.57888 } };
    const { result } = renderHook(() => useUserBuilding(location));
    expect(result.current).not.toBeNull();
    expect(result.current!.id).toBeDefined();
  });
});
