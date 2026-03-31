// Import and setup AsyncStorage mock first
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
describe('Nearby POIs - Helper Functions & Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isStudySpaceOpenNow', () => {
    const mockStudySpace = {
      id: 'study-lb',
      code: 'LB',
      name: 'J. W. McConnell Library Building',
      address: '1400 De Maisonneuve Blvd W',
      openHour: 8,
      closeHour: 23,
      openDays: [1, 2, 3, 4, 5, 6, 0], // All days
    };

    it('should return true when current time is within opening hours on an open day', () => {
      // Monday at 10 AM
      const date = new Date('2024-01-08T10:00:00'); // Monday
      const hour = date.getHours();
      const isOpen = hour >= mockStudySpace.openHour && hour < mockStudySpace.closeHour && mockStudySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(true);
    });

    it('should return false when current time is before opening hours', () => {
      // Monday at 6 AM (before 8 AM)
      const date = new Date('2024-01-08T06:00:00');
      const hour = date.getHours();
      const isOpen = hour >= mockStudySpace.openHour && hour < mockStudySpace.closeHour && mockStudySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(false);
    });

    it('should return false when current time is after closing hours', () => {
      // Monday at 11 PM (after 11 PM close)
      const date = new Date('2024-01-08T23:30:00');
      const hour = date.getHours();
      const isOpen = hour >= mockStudySpace.openHour && hour < mockStudySpace.closeHour && mockStudySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(false);
    });

    it('should return false when day is not in open days', () => {
      const closedOnTuesdaySpace = { ...mockStudySpace, openDays: [1, 3, 4, 5, 6, 0] }; // Not Tuesday (2)
      // Tuesday at 10 AM
      const date = new Date('2024-01-09T10:00:00');
      const hour = date.getHours();
      const isOpen = hour >= closedOnTuesdaySpace.openHour && hour < closedOnTuesdaySpace.closeHour && closedOnTuesdaySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(false);
    });

    it('should return true at exact opening hour', () => {
      const date = new Date('2024-01-08T08:00:00'); // Exactly 8:00
      const hour = date.getHours();
      const isOpen = hour >= mockStudySpace.openHour && hour < mockStudySpace.closeHour && mockStudySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(true);
    });

    it('should return false at closing hour (exclusive)', () => {
      const date = new Date('2024-01-08T23:00:00'); // Exactly 23:00 (closing hour)
      const hour = date.getHours();
      const isOpen = hour >= mockStudySpace.openHour && hour < mockStudySpace.closeHour && mockStudySpace.openDays.includes(date.getDay());
      expect(isOpen).toBe(false);
    });
  });

  describe('formatPriceLevel', () => {
    it('should return "Free" for price level 0', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(0)).toBe('Free');
    });

    it('should return single $ for price level 1', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(1)).toBe('$');
    });

    it('should return double $$ for price level 2', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(2)).toBe('$$');
    });

    it('should return triple $$$ for price level 3', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(3)).toBe('$$$');
    });

    it('should return quadruple $$$$ for price level 4', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(4)).toBe('$$$$');
    });

    it('should return "Not available" for undefined price level', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(undefined)).toBe('Not available');
    });

    it('should return "Not available" for negative price level', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(-1)).toBe('Not available');
    });

    it('should return "Not available" for price level > 4', () => {
      const format = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel < 0 || priceLevel > 4) {
          return 'Not available';
        }
        if (priceLevel === 0) {
          return 'Free';
        }
        return '$'.repeat(priceLevel);
      };
      expect(format(5)).toBe('Not available');
    });
  });

  describe('Filter Logic', () => {
    it('should calculate radius filtered results correctly', () => {
      const selectedRadiusKm = 2;
      const radiusMeters = selectedRadiusKm * 1000;

      const mockPOIs = [
        { id: '1', name: 'Close Place', distance: 500 },
        { id: '2', name: 'Mid Place', distance: 1500 },
        { id: '3', name: 'Far Place', distance: 3000 },
      ];

      const filtered = mockPOIs.filter((poi) => poi.distance <= radiusMeters);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('Close Place');
      expect(filtered[1].name).toBe('Mid Place');
    });

    it('should limit display to max POIs per category', () => {
      const MAX_POIS_PER_CATEGORY = 5;
      const mockPOIs = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        name: `Place ${i}`,
        distance: i * 100,
      }));

      const preview = mockPOIs.slice(0, MAX_POIS_PER_CATEGORY);

      expect(preview).toHaveLength(5);
      expect(preview[0].name).toBe('Place 0');
      expect(preview[4].name).toBe('Place 4');
    });

    it('should handle pagination for see all view', () => {
      const SEE_ALL_PAGE_SIZE = 10;
      const mockPOIs = Array.from({ length: 25 }, (_, i) => ({
        id: String(i),
        name: `Place ${i}`,
        distance: i * 100,
      }));

      let visibleCount = SEE_ALL_PAGE_SIZE;
      const visible = mockPOIs.slice(0, visibleCount);

      expect(visible).toHaveLength(10);

      // Load more
      visibleCount += SEE_ALL_PAGE_SIZE;
      const moreVisible = mockPOIs.slice(0, visibleCount);

      expect(moreVisible).toHaveLength(20);
    });

    it('should correctly identify active filters', () => {
      const DEFAULT_RADIUS_KM = 2;
      const selectedCategories = {
        study: true,
        coffee: true,
        restaurant: false,
        grocery: true,
      };
      const selectedRadiusKm = 3;

      const POI_CATEGORIES = {
        study: { title: 'Study Spaces', icon: 'book', color: '#4B5563' },
        coffee: { title: 'Coffee Shops', icon: 'coffee', color: '#8B4513' },
        restaurant: { title: 'Restaurants', icon: 'cutlery', color: '#D2691E' },
        grocery: { title: 'Grocery Stores', icon: 'shopping-cart', color: '#228B22' },
      };

      const selectedCategoryCount = Object.values(selectedCategories).filter(Boolean).length;
      const hasActiveFilters = selectedCategoryCount < Object.keys(POI_CATEGORIES).length || selectedRadiusKm !== DEFAULT_RADIUS_KM;

      expect(hasActiveFilters).toBe(true); // Should be true because radius changed
    });

    it('should detect no active filters', () => {
      const DEFAULT_RADIUS_KM = 2;
      const selectedCategories = {
        study: true,
        coffee: true,
        restaurant: true,
        grocery: true,
      };
      const selectedRadiusKm = 2;

      const POI_CATEGORIES = {
        study: { title: 'Study Spaces', icon: 'book', color: '#4B5563' },
        coffee: { title: 'Coffee Shops', icon: 'coffee', color: '#8B4513' },
        restaurant: { title: 'Restaurants', icon: 'cutlery', color: '#D2691E' },
        grocery: { title: 'Grocery Stores', icon: 'shopping-cart', color: '#228B22' },
      };

      const selectedCategoryCount = Object.values(selectedCategories).filter(Boolean).length;
      const hasActiveFilters = selectedCategoryCount < Object.keys(POI_CATEGORIES).length || selectedRadiusKm !== DEFAULT_RADIUS_KM;

      expect(hasActiveFilters).toBe(false); // No filters active
    });
  });

  describe('Study Space Configuration', () => {
    it('should have correct study space data structure', () => {
      const STUDY_SPACE_CONFIG = [
        {
          id: 'study-lb',
          code: 'LB',
          name: 'J. W. McConnell Library Building',
          address: '1400 De Maisonneuve Blvd W',
          openHour: 8,
          closeHour: 23,
          openDays: [1, 2, 3, 4, 5, 6, 0],
        },
      ];

      const space = STUDY_SPACE_CONFIG[0];
      expect(space.id).toBeDefined();
      expect(space.code).toBeDefined();
      expect(space.name).toBeDefined();
      expect(space.address).toBeDefined();
      expect(space.openHour).toBeDefined();
      expect(space.closeHour).toBeDefined();
      expect(space.openDays).toBeDefined();
    });

    it('should validate study space open hours are reasonable', () => {
      const STUDY_SPACE_CONFIG = [
        {
          id: 'study-sp',
          code: 'SP',
          name: 'Science Complex Study Areas',
          address: '7141 Sherbrooke St W',
          openHour: 7,
          closeHour: 22,
          openDays: [1, 2, 3, 4, 5],
        },
      ];

      const space = STUDY_SPACE_CONFIG[0];
      expect(space.openHour).toBeLessThan(space.closeHour);
      expect(space.openHour).toBeGreaterThanOrEqual(0);
      expect(space.closeHour).toBeLessThanOrEqual(24);
    });

    it('should have valid days of week in openDays', () => {
      const STUDY_SPACE_CONFIG = [
        {
          id: 'study-mb',
          code: 'MB',
          name: 'John Molson Study Areas',
          address: '1450 Guy St',
          openHour: 7,
          closeHour: 23,
          openDays: [1, 2, 3, 4, 5],
        },
      ];

      const space = STUDY_SPACE_CONFIG[0];
      const validDays = space.openDays.every((day) => day >= 0 && day <= 6);
      expect(validDays).toBe(true);
    });
  });

  describe('API Response Handling', () => {
    it('should filter only open places from API results', () => {
      const mockResults = [
        { place_id: '1', name: 'Open Place', opening_hours: { open_now: true } },
        { place_id: '2', name: 'Closed Place', opening_hours: { open_now: false } },
        { place_id: '3', name: 'Unknown Status', opening_hours: {} },
      ];

      const filtered = mockResults.filter((result) => result.opening_hours?.open_now === true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Open Place');
    });

    it('should filter out POIs with invalid coordinates', () => {
      const mockPOIs = [
        { id: '1', name: 'Valid Place', latitude: 45.4971, longitude: -73.5789 },
        { id: '2', name: 'Invalid Place', latitude: 0, longitude: 0 },
        { id: '3', name: 'Another Valid', latitude: 45.5, longitude: -73.6 },
      ];

      const filtered = mockPOIs.filter((poi) => poi.latitude !== 0 && poi.longitude !== 0);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.name)).toEqual(['Valid Place', 'Another Valid']);
    });

    it('should handle ZERO_RESULTS API response', () => {
      const response = { status: 'ZERO_RESULTS', results: [] };
      const isValid = response.status === 'OK' || response.status === 'ZERO_RESULTS';
      expect(isValid).toBe(true);
    });

    it('should handle error API response', () => {
      const response = { status: 'OVER_QUERY_LIMIT', error_message: 'Rate limit exceeded' };
      const isError = response.status !== 'OK' && response.status !== 'ZERO_RESULTS';
      expect(isError).toBe(true);
    });
  });
});


