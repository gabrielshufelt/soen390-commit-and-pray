import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_EXPIRATION_MS, CACHE_KEY_PREFIX } from '@/constants/poi.types';
import type { CacheEntry, POI } from '@/constants/poi.types';

const getCacheKey = (categoryKey: string): string => `${CACHE_KEY_PREFIX}${categoryKey}`;

export const getCachedPOIs = async (categoryKey: string): Promise<CacheEntry | null> => {
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(categoryKey));
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    if (now - entry.timestamp > CACHE_EXPIRATION_MS) {
      await AsyncStorage.removeItem(getCacheKey(categoryKey));
      return null;
    }

    return entry;
  } catch (error) {
    console.warn(`Failed to read cache for ${categoryKey}:`, error);
    return null;
  }
};

export const setCachedPOIs = async (categoryKey: string, pois: POI[], latitude: number, longitude: number): Promise<void> => {
  try {
    const entry: CacheEntry = {
      pois,
      timestamp: Date.now(),
      latitude,
      longitude,
    };
    await AsyncStorage.setItem(getCacheKey(categoryKey), JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to cache POIs for ${categoryKey}:`, error);
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};
