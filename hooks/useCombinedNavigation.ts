import { useState } from 'react';
import { getStitchedRoute, type CombinedNavigationStep } from '../utils/routeAggregator';
import { fetchOutdoorRoute } from '../utils/googleMapsService';
import { useDirections } from './useDirections';

export function useCombinedNavigation() {
  const [fullRoute, setFullRoute] = useState<CombinedNavigationStep[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const { apiKey } = useDirections(); 

  const calculateRoute = async (start: string, end: string, accessible: boolean, mode: string, userLoc: any) => {
    setIsCalculating(true);
    try {
      const route = await getStitchedRoute(start, end, accessible, mode, userLoc, 
        (s, e) => fetchOutdoorRoute(s, e, mode, apiKey)
      );
      setFullRoute(route);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  return { fullRoute, calculateRoute, isCalculating };
}