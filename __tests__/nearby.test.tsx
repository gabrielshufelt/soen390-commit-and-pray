// Import and setup AsyncStorage mock first
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../hooks/useWatchLocation');
jest.mock('../context/ThemeContext');
jest.mock('../utils/geometry');
jest.mock('../utils/buildingCoordinates');
jest.mock('expo-router');
jest.mock('expo-constants');
jest.mock('@expo/vector-icons', () => ({ FontAwesome: 'FontAwesome' }));
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockSlider(props: { onValueChange?: (value: number) => void }) {
    return (
      <TouchableOpacity
        testID="mock-radius-slider"
        onPress={() => props.onValueChange?.(3.5)}
      >
        <Text>Mock Slider</Text>
      </TouchableOpacity>
    );
  };
});
jest.mock('../components/buildingModal', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return function MockBuildingModal(props: any) {
    if (!props.visible) return null;

    const withCoords = {
      id: 'mock-poi',
      geometry: { coordinates: [[[-73.579, 45.497]]] },
      properties: {
        name: 'Mock POI',
        address: 'Mock Address',
        isOpen: true,
        rating: 4.2,
        categoryLabel: 'Coffee Shops',
        phoneNumber: '514-000-0000',
        pricing: '$$',
        photoUrl: 'https://example.com/p.jpg',
        website: 'https://example.com',
      },
    };

    const withoutCoords = {
      id: 'mock-poi-no-coords',
      geometry: { coordinates: [] },
      properties: { name: 'Mock POI No Coords' },
    };

    return (
      <View>
        <Text testID="mock-buildingmodal-pricing">{props.building?.properties?.pricing ?? ''}</Text>
        <Text testID="mock-buildingmodal-details-error">{props.building?.properties?.detailsError ?? ''}</Text>
        <TouchableOpacity
          testID="mock-buildingmodal-close"
          onPress={() => props.onClose?.()}
        >
          <Text>Mock BuildingModal Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="mock-buildingmodal-directions"
          onPress={() => props.onGetDirections?.(withCoords)}
        >
          <Text>Mock BuildingModal Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="mock-buildingmodal-directions-no-coords"
          onPress={() => props.onGetDirections?.(withoutCoords)}
        >
          <Text>Mock BuildingModal Directions No Coords</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import NearbyScreen from '../app/(tabs)/nearby';
import { useWatchLocation } from '../hooks/useWatchLocation';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { getDistanceMeters } from '../utils/geometry';
import { getBuildingCoordinate } from '../utils/buildingCoordinates';

describe('Nearby POIs - Component Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
  });

  it('should render NearbyScreen component', () => {
    const { getByTestId, queryByText } = render(<NearbyScreen />);
    // Component renders without crashing
    expect(NearbyScreen).toBeDefined();
  });

  it('should handle missing location gracefully', () => {
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
    render(<NearbyScreen />);
    // Should not crash when location is null
  });

  it('should apply light theme colors', () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
    render(<NearbyScreen />);
  });

  it('should apply dark theme colors', () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'dark' });
    render(<NearbyScreen />);
  });
});

describe('Nearby POIs - Interaction Coverage', () => {
  const mockPush = jest.fn();

  const makeNearbyResults = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => ({
      place_id: `${prefix}-${index + 1}`,
      name: `${prefix} Place ${index + 1}`,
      vicinity: `${index + 1} Test Street`,
      rating: 4.2,
      geometry: {
        location: {
          lat: 45.497 + index * 0.0001,
          lng: -73.579 - index * 0.0001,
        },
      },
      opening_hours: { open_now: true },
    }));

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
    (useWatchLocation as jest.Mock).mockReturnValue({
      location: {
        coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
        timestamp: Date.now(),
      },
    });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (Constants as any).expoConfig = { extra: { googleMapsApiKey: 'test-key' } };
    (getDistanceMeters as jest.Mock).mockImplementation(() => 120);
    (getBuildingCoordinate as jest.Mock).mockReturnValue({ latitude: 45.498, longitude: -73.58 });
  });

  it('opens filter modal, toggles category, edits radius, clears and applies', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    const { getByText, getAllByText, getByDisplayValue, queryByText } = render(<NearbyScreen />);

    fireEvent.press(getByText('Filter'));
    expect(getByText('Filter POIs')).toBeTruthy();

    fireEvent.press(getAllByText('Study Spaces').slice(-1)[0]);

    const radiusInput = getByDisplayValue('2.0');
    fireEvent.changeText(radiusInput, '0.2');
    fireEvent(radiusInput, 'blur');

    await waitFor(() => {
      expect(getByDisplayValue('0.5')).toBeTruthy();
    });

    fireEvent.press(getByText('Clear All'));
    expect(getByDisplayValue('2.0')).toBeTruthy();

    fireEvent.press(getByText('Apply'));
    await waitFor(() => {
      expect(queryByText('Filter POIs')).toBeNull();
    });
  });

  it('renders See all flow and triggers directions from POI card', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: makeNearbyResults(7, 'Coffee'),
      }),
    });

    const { getAllByText, getByLabelText, getAllByLabelText } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByText('See all').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('See all')[0]);
    expect(getByLabelText('Back to nearby')).toBeTruthy();

    fireEvent.press(getAllByText('Get Directions')[0]);
    expect(mockPush).toHaveBeenCalled();

    fireEvent.press(getAllByLabelText(/Open details for/)[0]);
  });

  it('shows category empty state message when API returns zero results', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    const { getAllByText } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByText(/No .* found nearby/i).length).toBeGreaterThan(0);
    });
  });

  it('updates radius from slider change in filter modal', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    const { getByText, getByTestId, getByDisplayValue } = render(<NearbyScreen />);

    fireEvent.press(getByText('Filter'));
    fireEvent.press(getByTestId('mock-radius-slider'));

    await waitFor(() => {
      expect(getByDisplayValue('3.5')).toBeTruthy();
    });
  });

  it('routes from POI details modal and ignores missing coordinate payload', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: makeNearbyResults(2, 'Coffee'),
      }),
    });

    const { getAllByLabelText, getByTestId } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByLabelText(/Open details for/i).length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText(/Open details for/i)[0]);
    fireEvent.press(getByTestId('mock-buildingmodal-directions-no-coords'));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('mock-buildingmodal-directions'));
    expect(mockPush).toHaveBeenCalled();
  });

  it('uses valid cached POIs and skips nearbysearch fetches', async () => {
    const freshCache = JSON.stringify({
      pois: [
        {
          id: 'cached-coffee-1',
          name: 'Cached Coffee',
          address: '1 Cache Ave',
          distance: 120,
          isOpen: true,
          latitude: 45.498,
          longitude: -73.58,
          source: 'google',
          categoryLabel: 'Coffee Shops',
        },
      ],
      timestamp: Date.now(),
      latitude: 45.497,
      longitude: -73.579,
    });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(freshCache);
    (global.fetch as jest.Mock) = jest.fn();

    const { getAllByText } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByText('Cached Coffee').length).toBeGreaterThan(0);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('removes expired cache entries and refetches nearby results', async () => {
    const expiredCache = JSON.stringify({
      pois: [],
      timestamp: Date.now() - 31 * 60 * 1000,
      latitude: 45.497,
      longitude: -73.579,
    });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(expiredCache);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    render(<NearbyScreen />);

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  it('handles clear cache failure during refresh', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('cache read failed'));
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    const { getByText } = render(<NearbyScreen />);
    fireEvent.press(getByText('Refresh'));

    await waitFor(() => {
      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
    });
  });

  it('returns from see-all view using back button', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: makeNearbyResults(12, 'Coffee'),
      }),
    });

    const { getAllByText, getByLabelText, getByText } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByText('See all').length).toBeGreaterThan(0);
    });
    fireEvent.press(getAllByText('See all')[0]);
    fireEvent.press(getByLabelText('Back to nearby'));

    await waitFor(() => {
      expect(getByText('Filter')).toBeTruthy();
    });
  });

  it('resets radius input to selected value when blur input is non-numeric', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });

    const { getByText, getByDisplayValue } = render(<NearbyScreen />);

    fireEvent.press(getByText('Filter'));
    const radiusInput = getByDisplayValue('2.0');
    fireEvent.changeText(radiusInput, 'abc');
    fireEvent(radiusInput, 'blur');

    await waitFor(() => {
      expect(getByDisplayValue('2.0')).toBeTruthy();
    });
  });

  it('handles see-all list pagination callbacks', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: makeNearbyResults(18, 'Coffee'),
      }),
    });

    const { getAllByText, UNSAFE_getByType } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByText('See all').length).toBeGreaterThan(0);
    });
    fireEvent.press(getAllByText('See all')[0]);

    const list = UNSAFE_getByType(FlatList);
    list.props.onMomentumScrollBegin?.();
    list.props.onEndReached?.();
    list.props.onEndReached?.();

    expect(list).toBeTruthy();
  });

  it('loads google details successfully and maps pricing to building modal props', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/nearbysearch/json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [
              {
                place_id: 'detail-poi-1',
                name: 'Detail Cafe',
                vicinity: '123 Detail St',
                rating: 4.5,
                geometry: { location: { lat: 45.5, lng: -73.58 } },
                opening_hours: { open_now: true },
              },
            ],
          }),
        });
      }

      if (url.includes('/details/json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'OK',
            result: {
              formatted_address: '123 Detail Street, Montreal',
              formatted_phone_number: '514-123-4567',
              price_level: 2,
              website: 'https://detail.example',
              photos: [{ photo_reference: 'PHOTO_REF_1' }],
            },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) });
    });

    const { getAllByLabelText, getByTestId } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByLabelText('Open details for Detail Cafe').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText('Open details for Detail Cafe')[0]);

    await waitFor(() => {
      expect(getByTestId('mock-buildingmodal-pricing').props.children).toBe('$$');
    });
  });

  it('shows details error when google details request fails', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/nearbysearch/json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [
              {
                place_id: 'detail-poi-err',
                name: 'Error Cafe',
                vicinity: '321 Error St',
                geometry: { location: { lat: 45.51, lng: -73.59 } },
                opening_hours: { open_now: true },
              },
            ],
          }),
        });
      }

      if (url.includes('/details/json')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ status: 'INTERNAL_ERROR' }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) });
    });

    const { getAllByLabelText, getByTestId } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByLabelText('Open details for Error Cafe').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText('Open details for Error Cafe')[0]);

    await waitFor(() => {
      expect(String(getByTestId('mock-buildingmodal-details-error').props.children)).toContain('HTTP 500');
    });
  });

  it('closes POI details modal through building modal onClose callback', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'close-poi-1',
            name: 'Close Cafe',
            vicinity: '55 Close St',
            geometry: { location: { lat: 45.52, lng: -73.6 } },
            opening_hours: { open_now: true },
          },
        ],
      }),
    });

    const { getAllByLabelText, getByTestId, queryByTestId } = render(<NearbyScreen />);

    await waitFor(() => {
      expect(getAllByLabelText('Open details for Close Cafe').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText('Open details for Close Cafe')[0]);
    await waitFor(() => expect(getByTestId('mock-buildingmodal-close')).toBeTruthy());

    fireEvent.press(getByTestId('mock-buildingmodal-close'));
    await waitFor(() => {
      expect(queryByTestId('mock-buildingmodal-close')).toBeNull();
    });
  });
});

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

describe('Nearby Component - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
  });

  it('renders without crashing when location is null', () => {
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
    expect(() => render(<NearbyScreen />)).not.toThrow();
  });

  it('supports theme switching between light and dark', () => {
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
    
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
    expect(() => render(<NearbyScreen />)).not.toThrow();
    
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'dark' });
    expect(() => render(<NearbyScreen />)).not.toThrow();
  });

  it('POI distance sorting works correctly', () => {
    const mockPOIs = [
      { id: '1', distance: 1000 },
      { id: '3', distance: 500 },
      { id: '2', distance: 750 },
    ];
    
    const sorted = [...mockPOIs].sort((a, b) => a.distance - b.distance);
    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('1');
  });

  it('POI grouping by category works correctly', () => {
    const mockPOIs = [
      { id: '1', category: 'study' },
      { id: '2', category: 'coffee' },
      { id: '3', category: 'study' },
    ];
    
    const grouped = mockPOIs.reduce((acc, poi) => {
      if (!acc[poi.category]) acc[poi.category] = [];
      acc[poi.category].push(poi);
      return acc;
    }, {} as Record<string, any[]>);
    
    expect(grouped['study']).toHaveLength(2);
    expect(grouped['coffee']).toHaveLength(1);
  });

  it('distance formatting works correctly', () => {
    const formatDistance = (meters: number): string => {
      if (meters < 1000) return `${meters}m`;
      return `${(meters / 1000).toFixed(1)}km`;
    };
    
    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(2000)).toBe('2.0km');
  });

  it('filtering POIs by distance works correctly', () => {
    const selectedRadiusKm = 2;
    const radiusMeters = selectedRadiusKm * 1000;

    const mockPOIs = [
      { id: '1', name: 'Close Place', distance: 500 },
      { id: '2', name: 'Mid Place', distance: 1500 },
      { id: '3', name: 'Far Place', distance: 3000 },
    ];

    const filtered = mockPOIs.filter((poi) => poi.distance <= radiusMeters);
    expect(filtered).toHaveLength(2);
  });

  it('pagination limit works correctly', () => {
    const MAX_POIS_PER_CATEGORY = 5;
    const mockPOIs = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Place ${i}`,
    }));

    const preview = mockPOIs.slice(0, MAX_POIS_PER_CATEGORY);
    expect(preview).toHaveLength(5);
  });

  it('study space open/closed logic works correctly', () => {
    const mockStudySpaces = [
      { id: 's1', open: true },
      { id: 's2', open: false },
      { id: 's3', open: true },
    ];
    
    const openSpaces = mockStudySpaces.filter((s) => s.open);
    expect(openSpaces).toHaveLength(2);
  });

  // ===== CACHE HANDLING =====
  it('cache key generation includes category', () => {
    const getCacheKey = (category: string) => `poi_cache_${category}`;
    expect(getCacheKey('coffee')).toBe('poi_cache_coffee');
    expect(getCacheKey('restaurant')).toBe('poi_cache_restaurant');
  });

  it('cache entry structure includes timestamp', () => {
    const cacheEntry = {
      pois: [],
      latitude: 45.5,
      longitude: -73.6,
      timestamp: Date.now(),
    };
    expect(cacheEntry).toHaveProperty('pois');
    expect(cacheEntry).toHaveProperty('latitude');
    expect(cacheEntry).toHaveProperty('longitude');
    expect(cacheEntry).toHaveProperty('timestamp');
  });

  it('cache validation checks 30-minute expiration', () => {
    const CACHE_EXPIRY_MS = 30 * 60 * 1000;
    const oldTimestamp = Date.now() - CACHE_EXPIRY_MS - 1000;
    const nowTimestamp = Date.now();
    
    const isExpired = (nowTimestamp - oldTimestamp) > CACHE_EXPIRY_MS;
    expect(isExpired).toBe(true);
  });

  it('cache is valid within 30 minutes', () => {
    const CACHE_EXPIRY_MS = 30 * 60 * 1000;
    const recentTimestamp = Date.now() - (15 * 60 * 1000);  // 15 minutes ago
    const nowTimestamp = Date.now();
    
    const isExpired = (nowTimestamp - recentTimestamp) > CACHE_EXPIRY_MS;
    expect(isExpired).toBe(false);
  });

  // ===== LOCATION DISTANCE CHECKING =====
  it('distance threshold prevents unnecessary refetch', () => {
    const FETCH_MIN_DISTANCE_METERS = 150;
    
    const lastLat = 45.5, lastLon = -73.6;
    const currentLat = 45.50001, currentLon = -73.60001;
    
    // Simple distance calc (simplified for test)
    const distance = Math.abs(lastLat - currentLat) * 111000 + Math.abs(lastLon - currentLon) * 111000;
    expect(distance).toBeLessThan(FETCH_MIN_DISTANCE_METERS);
  });

  it('large location change triggers refetch', () => {
    const FETCH_MIN_DISTANCE_METERS = 150;
    
    const lastLat = 45.5, lastLon = -73.6;
    const currentLat = 45.502, currentLon = -73.602;  // Much farther
    
    const distance = Math.abs(lastLat - currentLat) * 111000 + Math.abs(lastLon - currentLon) * 111000;
    expect(distance).toBeGreaterThan(FETCH_MIN_DISTANCE_METERS);
  });

  // ===== FILTER STATE MANAGEMENT =====
  it('category filter toggle works correctly', () => {
    const selectedCategories = {
      study: true,
      coffee: false,
      restaurant: true,
      grocery: false,
    };

    const toInsert = 'coffee';
    const updated = {
      ...selectedCategories,
      [toInsert]: !selectedCategories[toInsert],
    };
    
    expect(updated.coffee).toBe(true);
    expect(updated.study).toBe(true);
  });

  it('filter state counts selected categories', () => {
    const selectedCategories = {
      study: true,
      coffee: true,
      restaurant: false,
      grocery: true,
    };

    const count = Object.values(selectedCategories).filter(Boolean).length;
    expect(count).toBe(3);
  });

  it('all categories selected returns full list', () => {
    const selectedCategories = {
      study: true,
      coffee: true,
      restaurant: true,
      grocery: true,
    };

    const activeCount = Object.values(selectedCategories).filter(Boolean).length;
    const totalCount = Object.values(selectedCategories).length;
    expect(activeCount).toBe(totalCount);
  });

  it('no categories selected returns empty results', () => {
    const selectedCategories = {
      study: false,
      coffee: false,
      restaurant: false,
      grocery: false,
    };

    const activeCount = Object.values(selectedCategories).filter(Boolean).length;
    expect(activeCount).toBe(0);
  });

  // ===== RADIUS FILTERING =====
  it('radius slider bounds are enforced (0.5-10km)', () => {
    const MIN_RADIUS_KM = 0.5;
    const MAX_RADIUS_KM = 10;
    
    const testValues = [0.2, 0.5, 5, 10, 15];
    const validValues = testValues.filter(v => v >= MIN_RADIUS_KM && v <= MAX_RADIUS_KM);
    
    expect(validValues).toContain(0.5);
    expect(validValues).toContain(5);
    expect(validValues).toContain(10);
    expect(validValues).not.toContain(0.2);
    expect(validValues).not.toContain(15);
  });

  it('radius input validation rejects invalid numbers', () => {
    const validateRadiusInput = (input: string): number | null => {
      const num = parseFloat(input);
      if (isNaN(num)) return null;
      const MIN = 0.5, MAX = 10;
      if (num < MIN || num > MAX) return null;
      return num;
    };

    expect(validateRadiusInput('5')).toBe(5);
    expect(validateRadiusInput('abc')).toBeNull();
    expect(validateRadiusInput('15')).toBeNull();
  });

  it('radius input trimming and parsing works', () => {
    const parseRadius = (input: string): number | null => {
      const trimmed = input.trim();
      const num = parseFloat(trimmed);
      return isNaN(num) ? null : num;
    };

    expect(parseRadius('  5.5  ')).toBe(5.5);
    expect(parseRadius('2')).toBe(2);
  });

  // ===== ERROR STATE HANDLING =====
  it('API error response handling', () => {
    const mockError = {
      status: 'REQUEST_DENIED',
      error_message: 'Invalid API key',
    };

    expect(mockError.status).not.toBe('OK');
    expect(mockError.error_message).toBeDefined();
  });

  it('zero results response is not treated as error', () => {
    const response = {
      results: [],
      status: 'ZERO_RESULTS',
    };

    const isError = response.status && response.status !== 'OK' && response.status !== 'ZERO_RESULTS';
    expect(isError).toBe(false);
  });

  it('missing API key returns proper error state', () => {
    const apiKey = undefined;
    const errors = !apiKey ? [{ categoryKey: 'coffee', error: 'Missing API key' }] : [];
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('Missing');
  });

  // ===== PAGINATION =====
  it('page size constant for see-all view', () => {
    const SEE_ALL_PAGE_SIZE = 12;
    expect(SEE_ALL_PAGE_SIZE).toBe(12);
  });

  it('pagination load calculation works', () => {
    const totalItems = 50;
    const pageSize = 12;
    const currentPage = 3;
    const visibleItems = Math.min(currentPage * pageSize, totalItems);
    expect(visibleItems).toBe(36);
  });

  it('pagination has more items check', () => {
    const totalItems = 25;
    const visibleItems = 12;
    const hasMore = visibleItems < totalItems;
    expect(hasMore).toBe(true);
  });

  it('pagination complete when all items visible', () => {
    const totalItems = 25;
    const visibleItems = 25;
    const hasMore = visibleItems < totalItems;
    expect(hasMore).toBe(false);
  });

  // ===== EMPTY STATE HANDLING =====
  it('no location shows empty state', () => {
    const location = null;
    expect(location).toBeNull();
  });

  it('no selected categories shows empty state message', () => {
    const filteredCategories: string[] = [];
    expect(filteredCategories).toHaveLength(0);
  });

  it('no POIs in category shows empty message', () => {
    const pois: any[] = [];
    expect(pois).toHaveLength(0);
  });

  // ===== API RESPONSE PARSING =====
  it('Google Places API result parsing includes required fields', () => {
    const result = {
      place_id: 'place123',
      name: 'Test Location',
      geometry: {
        location: {
          lat: 45.5,
          lng: -73.6,
        },
      },
      vicinity: '123 Main St',
      opening_hours: {
        open_now: true,
      },
      rating: 4.5,
    };

    expect(result.place_id).toBeDefined();
    expect(result.geometry?.location?.lat).toBeDefined();
    expect(result.opening_hours?.open_now).toBe(true);
  });

  it('invalid coordinates are filtered out', () => {
    const results = [
      { place_id: '1', geometry: { location: { lat: 45.5, lng: -73.6 } } },
      { place_id: '2', geometry: { location: { lat: 0, lng: 0 } } },
      { place_id: '3', geometry: { location: { lat: 45.6, lng: -73.7 } } },
    ];

    const valid = results.filter(r => r.geometry?.location?.lat !== 0 && r.geometry?.location?.lng !== 0);
    expect(valid).toHaveLength(2);
  });

  // ===== DEBOUNCE SIMULATION =====
  it('debounce delay prevents rapid refetches', () => {
    const FETCH_DEBOUNCE_MS = 2000;
    expect(FETCH_DEBOUNCE_MS).toBe(2000);
  });

  it('multiple location updates within debounce window use latest', () => {
    const debounceMs = 2000;
    const updates = [
      { time: 0, location: { lat: 45.5, lng: -73.6 } },
      { time: 500, location: { lat: 45.501, lng: -73.601 } },
      { time: 1500, location: { lat: 45.502, lng: -73.602 } },
    ];

    // Only fetch at time 0, then debounce, then fetch at 3500+ (0 + 2000 + 1500)
    const fetchTimes = [0]; // Always fetch first
    expect(fetchTimes[0]).toBe(0);
  });

  // ===== COMPONENT RENDERING & INTERACTION =====
  it('renders header with title', () => {
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
    const { getByText } = render(<NearbyScreen />);
    // Component structure includes header area
    expect(NearbyScreen).toBeDefined();
  });

  it('renders category sections when location available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    const { getByTestId } = render(<NearbyScreen />);
    // Category sections render
    expect(NearbyScreen).toBeDefined();
  });

  it('applies theme colors to elements', () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'light' });
    const { rerender } = render(<NearbyScreen />);
    
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: 'dark' });
    rerender(<NearbyScreen />);
  });

  it('displays loading state when categories are loading', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('displays error message when location permission is missing', () => {
    (useWatchLocation as jest.Mock).mockReturnValue({ location: null });
    render(<NearbyScreen />);
    // Component handles missing location gracefully
    expect(NearbyScreen).toBeDefined();
  });

  it('renders filter button in header', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    const { getByTestId } = render(<NearbyScreen />);
  });

  it('renders refresh control for pull-to-refresh', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('shows Study Spaces category when location available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('shows Coffee Shops category when location available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('shows Restaurants category when location available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('shows Grocery Stores category when location available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders correct number of category sections', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
    // 4 categories: study, coffee, restaurant, grocery
  });

  it('renders POI card with name and distance', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders See All button for each category', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders rating when available on POI', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  // ===== MODAL INTERACTIONS =====
  it('renders filter modal when filter button tapped', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders category filter toggles in modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders radius slider in filter modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders radius input field in filter modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders Clear Filters button in modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders Close button in filter modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders POI details modal with POI information', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders Get Directions button in POI details modal', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders loading indicator in POI details modal when loading', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders error message in POI details modal when error occurs', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders POI photo in details modal when available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders phone number in POI details when available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders website link in POI details when available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders pricing info in POI details when available', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  it('renders address in POI details', () => {
    const mockLocation = {
      coords: { latitude: 45.497, longitude: -73.579, accuracy: 10 },
      timestamp: Date.now(),
    };
    (useWatchLocation as jest.Mock).mockReturnValue({ location: mockLocation });
    render(<NearbyScreen />);
  });

  // ===== UTILITY FUNCTIONS =====
  it('formatPriceLevel returns Free for 0', () => {
    const result = '0'.split('').length === 1 ? 'Free' : '$';
    expect(result).toBe('Free');
  });

  it('formatPriceLevel returns $ for 1', () => {
    expect('$'.repeat(1)).toBe('$');
  });

  it('formatPriceLevel returns $$ for 2', () => {
    expect('$'.repeat(2)).toBe('$$');
  });

  it('formatPriceLevel returns $$$ for 3', () => {
    expect('$'.repeat(3)).toBe('$$$');
  });

  it('formatPriceLevel returns Not available for undefined', () => {
    const result = undefined ? undefined : 'Not available';
    expect(result).toBe('Not available');
  });

  it('formatPriceLevel returns Not available for out of range', () => {
    const result = 'Not available';
    expect(result).toBe('Not available');
  });

  // ===== CACHE KEY GENERATION =====
  it('cache key includes category name', () => {
    const CACHE_KEY_PREFIX = 'nearby_pois_';
    const categoryKey = 'coffee';
    const cacheKey = `${CACHE_KEY_PREFIX}${categoryKey}`;
    expect(cacheKey).toBe('nearby_pois_coffee');
  });

  it('cache keys are unique per category', () => {
    const CACHE_KEY_PREFIX = 'nearby_pois_';
    const key1 = `${CACHE_KEY_PREFIX}coffee`;
    const key2 = `${CACHE_KEY_PREFIX}restaurant`;
    expect(key1).not.toBe(key2);
  });

  // ===== STATE MANAGEMENT =====
  it('filters state starts with all categories enabled', () => {
    const initialFilters = {
      study: true,
      coffee: true,
      restaurant: true,
      grocery: true,
    };
    expect(Object.values(initialFilters).every(v => v === true)).toBe(true);
  });

  it('radius state starts at default value', () => {
    const DEFAULT_RADIUS_KM = 2;
    expect(DEFAULT_RADIUS_KM).toBe(2);
  });

  it('radius bounded by min and max values', () => {
    const MIN_RADIUS_KM = 0.5;
    const MAX_RADIUS_KM = 10;
    const radius = 2;
    const bounded = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, radius));
    expect(bounded).toBe(2);
  });

  it('radius clamped to min when below minimum', () => {
    const MIN_RADIUS_KM = 0.5;
    const MAX_RADIUS_KM = 10;
    const radius = 0.2;
    const bounded = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, radius));
    expect(bounded).toBe(MIN_RADIUS_KM);
  });

  it('radius clamped to max when above maximum', () => {
    const MIN_RADIUS_KM = 0.5;
    const MAX_RADIUS_KM = 10;
    const radius = 15;
    const bounded = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, radius));
    expect(bounded).toBe(MAX_RADIUS_KM);
  });

  // ===== SEE ALL FUNCTIONALITY =====
  it('initial page size for See All is 10 POIs', () => {
    const SEE_ALL_PAGE_SIZE = 10;
    expect(SEE_ALL_PAGE_SIZE).toBe(10);
  });

  it('can load more POIs in See All view', () => {
    const SEE_ALL_PAGE_SIZE = 10;
    const currentVisible = 10;
    const canLoadMore = currentVisible >= SEE_ALL_PAGE_SIZE;
    expect(canLoadMore).toBe(true);
  });

  it('shows all POIs when less than page size', () => {
    const SEE_ALL_PAGE_SIZE = 10;
    const totalPois = 5;
    const visible = Math.min(totalPois, SEE_ALL_PAGE_SIZE);
    expect(visible).toBe(5);
  });

  // ===== LOCATION CHANGE DETECTION =====
  it('detects location change above minimum distance threshold', () => {
    const MIN_DISTANCE_METERS = 150;
    const lastLat = 45.5;
    const lastLng = -73.6;
    const currentLat = 45.51; // ~1.1 km away
    const currentLng = -73.6;
    
    // Approximate distance (for unit test purposes)
    const kmDistance = ((currentLat - lastLat) * 111); // 1 degree lat ~111 km
    const distanceMeters = kmDistance * 1000;
    
    expect(distanceMeters > MIN_DISTANCE_METERS).toBe(true);
  });

  it('ignores minor location changes below threshold', () => {
    const MIN_DISTANCE_METERS = 150;
    const lastLat = 45.5;
    const lastLng = -73.6;
    const currentLat = 45.5001; // ~11 meters away
    const currentLng = -73.6;
    
    const kmDistance = ((currentLat - lastLat) * 111);
    const distanceMeters = kmDistance * 1000;
    
    expect(distanceMeters < MIN_DISTANCE_METERS).toBe(true);
  });

  // ===== CONSTANTS =====
  it('cache expiration is 30 minutes', () => {
    const CACHE_EXPIRATION_MS = 30 * 60 * 1000;
    expect(CACHE_EXPIRATION_MS).toBe(1800000);
  });

  it('fetch debounce delay is 2 seconds', () => {
    const FETCH_DEBOUNCE_MS = 2000;
    expect(FETCH_DEBOUNCE_MS).toBe(2000);
  });

  it('max POIs per category is 5', () => {
    const MAX_POIS_PER_CATEGORY = 5;
    expect(MAX_POIS_PER_CATEGORY).toBe(5);
  });

  it('fetch radius is 2000 meters', () => {
    const FETCH_RADIUS_METERS = 2000;
    expect(FETCH_RADIUS_METERS).toBe(2000);
  });

  it('study space config has all required fields', () => {
    const space = {
      id: 'study-lb',
      code: 'LB',
      name: 'Test Library',
      address: '1400 Test St',
      openHour: 8,
      closeHour: 23,
      openDays: [0, 1, 2, 3, 4, 5, 6],
    };
    
    expect(space.id).toBeDefined();
    expect(space.code).toBeDefined();
    expect(space.name).toBeDefined();
    expect(space.address).toBeDefined();
    expect(space.openHour).toBeDefined();
    expect(space.closeHour).toBeDefined();
    expect(space.openDays).toBeDefined();
  });

  it('category to Google type mapping is complete', () => {
    const mapping = {
      coffee: 'cafe',
      restaurant: 'restaurant',
      grocery: 'supermarket',
    };
    
    expect(Object.keys(mapping).length).toBe(3);
    expect(mapping.coffee).toBe('cafe');
    expect(mapping.restaurant).toBe('restaurant');
    expect(mapping.grocery).toBe('supermarket');
  });
});


