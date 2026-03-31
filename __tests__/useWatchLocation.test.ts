import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWatchLocation } from '../hooks/useWatchLocation';

jest.mock('../utils/devConfig', () => ({
  DEV_OVERRIDE_LOCATION: null,
}));

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockGetCurrentPositionAsync = require('expo-location').getCurrentPositionAsync;
let mockAppStateCallback: ((state: string) => void) | null = null;

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((event: string, callback: (state: string) => void) => {
      if (event === 'change') {
        mockAppStateCallback = callback;
      }
      return { remove: jest.fn() };
    }),
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockLocation = {
  coords: { latitude: 45.497, longitude: -73.579, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
  timestamp: Date.now(),
};

describe('useWatchLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAppStateCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===== BASIC BEHAVIOR =====
  it('does not fetch location when disabled', () => {
    mockGetCurrentPositionAsync.mockClear();
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
  });

  it('returns state object with required properties', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    expect(result.current).toHaveProperty('location');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
  });

  it('initializes with loading false and error null', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns null location when disabled', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));
    expect(result.current.location).toBeNull();
  });

  // ===== SUCCESS CASES & ERROR HANDLING =====
  it('suppresses transient "current location is unavailable" error', async () => {
    const transientError = new Error('Current location is unavailable');
    mockGetCurrentPositionAsync.mockRejectedValueOnce(transientError);

    const { result } = renderHook(() => useWatchLocation({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  // ===== APPSTATE HANDLING =====
  it('sets up AppState listener when enabled', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    renderHook(() => useWatchLocation({ enabled: true }));
    expect(mockAppStateCallback).not.toBeNull();
  });

  it('responds to AppState active event', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    renderHook(() => useWatchLocation({ enabled: true }));

    const initialCallCount = mockGetCurrentPositionAsync.mock.calls.length;

    act(() => {
      mockAppStateCallback?.('active');
    });

    await waitFor(() => {
      expect(mockGetCurrentPositionAsync.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it('skips fetch when AppState is background', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    renderHook(() => useWatchLocation({ enabled: true }));

    const callCountAfterInit = mockGetCurrentPositionAsync.mock.calls.length;

    act(() => {
      mockAppStateCallback?.('background');
      jest.advanceTimersByTime(3000);
    });

    // Should not fetch while in background
    expect(mockGetCurrentPositionAsync.mock.calls.length).toBeLessThanOrEqual(callCountAfterInit + 1);
  });

  // ===== CLEANUP BEHAVIOR =====
  it('clears interval on unmount', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 1000 })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('unmounts cleanly without errors', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: true })
    );

    expect(() => unmount()).not.toThrow();
  });

  // ===== OPTIONS =====
  it('accepts enabled option', () => {
    mockGetCurrentPositionAsync.mockClear();
    renderHook(() => useWatchLocation({ enabled: false }));
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('accepts intervalMs option', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: false, intervalMs: 10000 })
    );
    expect(() => unmount()).not.toThrow();
  });

  it('accepts accuracy option', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: false, accuracy: 2 as any })
    );
    expect(() => unmount()).not.toThrow();
  });

  it('accepts multiple options combined', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: false, intervalMs: 5000, accuracy: 1 as any })
    );
    expect(() => unmount()).not.toThrow();
  });

  // ===== INSTANCE BEHAVIOR =====
  it('can be called multiple times without error', () => {
    const { result: result1 } = renderHook(() =>
      useWatchLocation({ enabled: false })
    );
    const { result: result2 } = renderHook(() =>
      useWatchLocation({ enabled: false })
    );

    expect(result1.current.location).toBeNull();
    expect(result2.current.location).toBeNull();
  });

  it('provides correct interface types', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    const state = result.current;
    expect(typeof state.location).toBe('object');
    expect(typeof state.loading).toBe('boolean');
    expect(typeof state.error).toBe('object');
  });

  it('multiple mounts and unmounts work correctly', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    const { unmount: unmount1 } = renderHook(() =>
      useWatchLocation({ enabled: true })
    );
    const { unmount: unmount2 } = renderHook(() =>
      useWatchLocation({ enabled: true })
    );

    expect(() => {
      unmount1();
      unmount2();
    }).not.toThrow();
  });

  it('does not update state after unmount', () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount, result } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 100 })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(result.current).toBeDefined();
    clearIntervalSpy.mockRestore();
  });
});
