import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWatchLocation } from '../hooks/useWatchLocation';

jest.mock('../utils/devConfig', () => ({
  DEV_OVERRIDE_LOCATION: null,
}));

const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPositionAsync(...args),
  Accuracy: { Balanced: 3 },
}));

const mockLocation = {
  coords: { latitude: 45.497, longitude: -73.579 },
  timestamp: Date.now(),
};

describe('useWatchLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch location when disabled', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
  });
});
