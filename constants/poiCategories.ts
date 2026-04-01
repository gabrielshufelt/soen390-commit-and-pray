import type { StudySpaceConfig } from './poi.types';

export const POI_CATEGORIES = {
  study: { title: 'Study Spaces', icon: 'book', color: '#4B5563' },
  coffee: { title: 'Coffee Shops', icon: 'coffee', color: '#8B4513' },
  restaurant: { title: 'Restaurants', icon: 'cutlery', color: '#D2691E' },
  grocery: { title: 'Grocery Stores', icon: 'shopping-cart', color: '#228B22' },
};

export type CategoryKey = keyof typeof POI_CATEGORIES;

export const CATEGORY_TO_GOOGLE_TYPE: Record<string, string> = {
  coffee: 'cafe',
  restaurant: 'restaurant',
  grocery: 'supermarket',
};

export const CATEGORY_KEYS = Object.keys(POI_CATEGORIES) as CategoryKey[];

export const FETCH_DEBOUNCE_MS = 2000;
export const FETCH_MIN_DISTANCE_METERS = 150;
export const FETCH_RADIUS_METERS = 2000;
export const MAX_POIS_PER_CATEGORY = 5;
export const SEE_ALL_PAGE_SIZE = 10;
export const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes
export const CACHE_KEY_PREFIX = 'nearby_pois_';

export const DEFAULT_RADIUS_KM = 2;
export const MIN_RADIUS_KM = 0.5;
export const MAX_RADIUS_KM = 10;

export const STUDY_SPACE_CONFIG: StudySpaceConfig[] = [
  {
    id: 'study-lb',
    code: 'LB',
    name: 'J. W. McConnell Library Building',
    address: '1400 De Maisonneuve Blvd W',
    openHour: 8,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-vl',
    code: 'VL',
    name: 'Vanier Library',
    address: '7141 Sherbrooke St W',
    openHour: 8,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-h',
    code: 'H',
    name: 'Hall Building Study Areas',
    address: '1455 De Maisonneuve Blvd W',
    openHour: 7,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    id: 'study-sp',
    code: 'SP',
    name: 'Science Complex Study Areas',
    address: '7141 Sherbrooke St W',
    openHour: 7,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5],
  },
  {
    id: 'study-mb',
    code: 'MB',
    name: 'John Molson Study Areas',
    address: '1450 Guy St',
    openHour: 7,
    closeHour: 23,
    openDays: [1, 2, 3, 4, 5],
  },
  {
    id: 'study-cc',
    code: 'CC',
    name: 'Central Building Study Areas',
    address: '7141 Sherbrooke St W',
    openHour: 8,
    closeHour: 22,
    openDays: [1, 2, 3, 4, 5, 6],
  },
];
