import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEV_OVERRIDE_LOCATION } from '../utils/devConfig';

export interface WatchLocationState {
  location: Location.LocationObject | null;
  loading: boolean;
  error: string | null;
}

interface UseWatchLocationOptions {
  enabled?: boolean;
  intervalMs?: number;
  accuracy?: Location.Accuracy;
}

/**
 * Custom hook to watch and update user location at regular intervals
 * @param options Configuration options
 * @param options.enabled Whether to start watching location (default: true)
 * @param options.intervalMs Update interval in milliseconds (default: 5000)
 * @param options.accuracy Location accuracy (default: Balanced)
 */
export function useWatchLocation(options: UseWatchLocationOptions = {}) {
  const {
    enabled = true,
    intervalMs = 5000,
    accuracy = Location.Accuracy.Balanced,
  } = options;

  const [locationState, setLocationState] = useState<WatchLocationState>({
    location: DEV_OVERRIDE_LOCATION
      ? ({
          coords: {
            latitude: DEV_OVERRIDE_LOCATION.latitude,
            longitude: DEV_OVERRIDE_LOCATION.longitude,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as unknown as Location.LocationObject)
      : null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (DEV_OVERRIDE_LOCATION || !enabled) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let isMounted = true;

    const updateLocation = async () => {
      try {
        if (!isMounted) return;
        
        setLocationState(prev => ({ ...prev, loading: true, error: null }));
        
        const location = await Location.getCurrentPositionAsync({
          accuracy,
        });
        
        if (isMounted) {
          setLocationState({ location, loading: false, error: null });
        }
      } catch (error) {
        console.error('Error updating location:', error);
        if (isMounted) {
          setLocationState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }
    };

    // Get initial location
    updateLocation();

    // Set up interval for updates
    intervalId = setInterval(updateLocation, intervalMs);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enabled, intervalMs, accuracy]);

  return locationState;
}
