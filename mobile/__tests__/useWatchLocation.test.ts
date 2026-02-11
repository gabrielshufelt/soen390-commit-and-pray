import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWatchLocation } from '../hooks/useWatchLocation';

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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches location on mount when enabled', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useWatchLocation({ enabled: true }));

    await waitFor(() => {
      expect(result.current.location).toEqual(mockLocation);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch location when disabled', () => {
    const { result } = renderHook(() => useWatchLocation({ enabled: false }));

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
  });

  it('updates location on interval', async () => {
    const loc1 = { ...mockLocation, timestamp: 1 };
    const loc2 = { ...mockLocation, coords: { latitude: 45.5, longitude: -73.6 }, timestamp: 2 };

    mockGetCurrentPositionAsync
      .mockResolvedValueOnce(loc1)
      .mockResolvedValueOnce(loc2);

    const { result } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 1000 })
    );

    await waitFor(() => {
      expect(result.current.location).toEqual(loc1);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.location).toEqual(loc2);
    });
  });

  it('handles Error instance in catch block', async () => {
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('Location unavailable'));
    jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useWatchLocation({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBe('Location unavailable');
    });
    expect(result.current.loading).toBe(false);

    (console.error as jest.Mock).mockRestore();
  });

  it('handles non-Error throw in catch block', async () => {
    mockGetCurrentPositionAsync.mockRejectedValue('string error');
    jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useWatchLocation({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBe('Unknown error');
    });
    expect(result.current.loading).toBe(false);

    (console.error as jest.Mock).mockRestore();
  });

  it('clears interval on unmount', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    const { result, unmount } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 1000 })
    );

    await waitFor(() => {
      expect(result.current.location).toEqual(mockLocation);
    });

    unmount();

    // After unmount, advancing timers should not cause errors
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
  });

  it('uses default options when none provided', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useWatchLocation());

    await waitFor(() => {
      expect(result.current.location).toEqual(mockLocation);
    });
    // Verify defaults were used: enabled=true (fetch was called), accuracy=Balanced
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('does not update state after unmount during fetch', async () => {
    // Make the mock hang so we can unmount before it resolves
    let resolveLocation: (value: any) => void;
    mockGetCurrentPositionAsync.mockImplementation(
      () => new Promise((resolve) => { resolveLocation = resolve; })
    );

    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 10000 })
    );

    // Unmount while the fetch is still pending
    unmount();

    // Resolve after unmount — should not throw or update state
    await act(async () => {
      resolveLocation!(mockLocation);
    });
  });

  it('does not update state after unmount during error', async () => {
    let rejectLocation: (reason: any) => void;
    mockGetCurrentPositionAsync.mockImplementation(
      () => new Promise((_, reject) => { rejectLocation = reject; })
    );
    jest.spyOn(console, 'error').mockImplementation();

    const { unmount } = renderHook(() =>
      useWatchLocation({ enabled: true, intervalMs: 10000 })
    );

    unmount();

    await act(async () => {
      rejectLocation!(new Error('fail'));
    });

    (console.error as jest.Mock).mockRestore();
  });
});
