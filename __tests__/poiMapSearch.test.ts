jest.mock('../utils/poiFetch');
jest.mock('../utils/buildingCoordinates');
jest.mock('../utils/geometry');

import { searchPoisForMap } from '../utils/poiMapSearch';
import { fetchCategoryResult } from '../utils/poiFetch';
import { getBuildingCoordinate } from '../utils/buildingCoordinates';
import { getDistanceMeters } from '../utils/geometry';
import type { POI } from '../constants/poi.types';

const mockFetchCategoryResult = fetchCategoryResult as jest.MockedFunction<typeof fetchCategoryResult>;
const mockGetBuildingCoordinate = getBuildingCoordinate as jest.MockedFunction<typeof getBuildingCoordinate>;
const mockGetDistanceMeters = getDistanceMeters as jest.MockedFunction<typeof getDistanceMeters>;

const baseCoords = { latitude: 45.497, longitude: -73.579 };

const makePoi = (id: string, distance: number): POI => ({
  id,
  name: `POI ${id}`,
  address: `${id} Street`,
  distance,
  isOpen: true,
  latitude: 45.497 + distance * 0.0001,
  longitude: -73.579 + distance * 0.0001,
  source: 'google',
  categoryLabel: 'Coffee Shops',
});

describe('searchPoisForMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDistanceMeters.mockImplementation(
      (_lat1, _lon1, _lat2, _lon2) => Math.abs(_lat1 - _lat2) * 111000
    );
  });

  describe('study category', () => {
    it('returns study space POIs from internal data', async () => {
      mockGetBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });

      const { pois, error } = await searchPoisForMap('study', baseCoords, 'test-key');

      expect(error).toBeNull();
      expect(pois.length).toBeGreaterThan(0);
      expect(pois.length).toBeLessThanOrEqual(5);
      pois.forEach((poi) => {
        expect(poi.source).toBe('study');
        expect(poi.pricing).toBe('Free');
        expect(poi.categoryLabel).toBe('Study Spaces');
      });
    });

    it('caps study space results to 5', async () => {
      mockGetBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });

      const { pois } = await searchPoisForMap('study', baseCoords, 'test-key');

      expect(pois.length).toBeLessThanOrEqual(5);
    });

    it('does not require an API key for study spaces', async () => {
      mockGetBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });

      const { pois, error } = await searchPoisForMap('study', baseCoords, '');

      expect(error).toBeNull();
      expect(pois.length).toBeGreaterThan(0);
    });

    it('returns sorted results by distance', async () => {
      mockGetBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });

      const { pois } = await searchPoisForMap('study', baseCoords, 'test-key');

      for (let i = 1; i < pois.length; i++) {
        expect(pois[i].distance).toBeGreaterThanOrEqual(pois[i - 1].distance);
      }
    });

    it('skips buildings with no coordinate', async () => {
      mockGetBuildingCoordinate.mockReturnValue(undefined as any);

      const { pois, error } = await searchPoisForMap('study', baseCoords, 'test-key');

      expect(error).toBeNull();
      expect(pois).toEqual([]);
    });

    it('includes both open and closed study spaces', async () => {
      mockGetBuildingCoordinate.mockReturnValue({ latitude: 45.497, longitude: -73.579 });
      mockGetDistanceMeters.mockReturnValue(100);

      const { pois } = await searchPoisForMap('study', baseCoords, 'test-key');

      expect(pois.length).toBeGreaterThan(0);
      const hasIsOpenField = pois.every((p) => typeof p.isOpen === 'boolean');
      expect(hasIsOpenField).toBe(true);
    });
  });

  describe('Google categories (coffee, restaurant, grocery)', () => {
    it('returns POIs from fetchCategoryResult for coffee', async () => {
      const mockPois = [makePoi('c1', 100), makePoi('c2', 200)];
      mockFetchCategoryResult.mockResolvedValue({ categoryKey: 'coffee', pois: mockPois });

      const { pois, error } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      expect(error).toBeNull();
      expect(pois.length).toBe(2);
      expect(mockFetchCategoryResult).toHaveBeenCalledWith('coffee', 'cafe', baseCoords, 'test-key');
    });

    it('returns POIs from fetchCategoryResult for restaurant', async () => {
      const mockPois = [makePoi('r1', 100)];
      mockFetchCategoryResult.mockResolvedValue({ categoryKey: 'restaurant', pois: mockPois });

      const { pois, error } = await searchPoisForMap('restaurant', baseCoords, 'test-key');

      expect(error).toBeNull();
      expect(pois.length).toBe(1);
      expect(mockFetchCategoryResult).toHaveBeenCalledWith('restaurant', 'restaurant', baseCoords, 'test-key');
    });

    it('returns POIs from fetchCategoryResult for grocery', async () => {
      const mockPois = [makePoi('g1', 100)];
      mockFetchCategoryResult.mockResolvedValue({ categoryKey: 'grocery', pois: mockPois });

      const { pois, error } = await searchPoisForMap('grocery', baseCoords, 'test-key');

      expect(error).toBeNull();
      expect(pois.length).toBe(1);
      expect(mockFetchCategoryResult).toHaveBeenCalledWith('grocery', 'supermarket', baseCoords, 'test-key');
    });

    it('caps results to 5 POIs', async () => {
      const mockPois = Array.from({ length: 8 }, (_, i) => makePoi(`p${i}`, (i + 1) * 100));
      mockFetchCategoryResult.mockResolvedValue({ categoryKey: 'coffee', pois: mockPois });

      const { pois } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      expect(pois.length).toBe(5);
    });

    it('sorts results by distance from search center', async () => {
      const mockPois = [makePoi('far', 500), makePoi('near', 50), makePoi('mid', 200)];
      mockFetchCategoryResult.mockResolvedValue({ categoryKey: 'coffee', pois: mockPois });

      const { pois } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      for (let i = 1; i < pois.length; i++) {
        expect(pois[i].distance).toBeGreaterThanOrEqual(pois[i - 1].distance);
      }
    });

    it('returns error when fetchCategoryResult returns an error', async () => {
      mockFetchCategoryResult.mockResolvedValue({
        categoryKey: 'coffee',
        error: 'API rate limit exceeded',
      });

      const { pois, error } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      expect(pois).toEqual([]);
      expect(error).toBe('API rate limit exceeded');
    });

    it('returns error when API key is missing', async () => {
      const { pois, error } = await searchPoisForMap('coffee', baseCoords, '');

      expect(pois).toEqual([]);
      expect(error).toBe('Missing Google Maps API key');
      expect(mockFetchCategoryResult).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns error for unknown category key', async () => {
      const { pois, error } = await searchPoisForMap(
        'unknown' as any,
        baseCoords,
        'test-key',
      );

      expect(pois).toEqual([]);
      expect(error).toBe('Unknown category: unknown');
    });

    it('catches exceptions thrown by fetchCategoryResult', async () => {
      mockFetchCategoryResult.mockRejectedValue(new Error('Network failure'));

      const { pois, error } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      expect(pois).toEqual([]);
      expect(error).toBe('Network failure');
    });

    it('handles non-Error exceptions gracefully', async () => {
      mockFetchCategoryResult.mockRejectedValue('something went wrong');

      const { pois, error } = await searchPoisForMap('coffee', baseCoords, 'test-key');

      expect(pois).toEqual([]);
      expect(error).toBe('Failed to search POIs');
    });
  });
});
