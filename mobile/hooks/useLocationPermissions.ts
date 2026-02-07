import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface LocationPermissionState {
  granted: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to handle location permissions
 * Requests foreground location permissions when in use
 */
export function useLocationPermissions() {
  const [permissionState, setPermissionState] = useState<LocationPermissionState>({
    granted: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        setPermissionState(prev => ({ ...prev, loading: true, error: null }));
        
        // Request foreground permissions (when in use)
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          setPermissionState({ granted: true, loading: false, error: null });
        } else {
          setPermissionState({ 
            granted: false, 
            loading: false, 
            error: 'Location permission denied' 
          });
        }
      } catch (error) {
        console.error('Error requesting location permissions:', error);
        setPermissionState({
          granted: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    requestPermissions();
  }, []);

  return permissionState;
}
