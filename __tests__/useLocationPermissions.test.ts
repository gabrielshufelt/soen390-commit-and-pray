import { renderHook, waitFor } from '@testing-library/react-native';
import { useLocationPermissions } from '../hooks/useLocationPermissions';

const mockRequestForegroundPermissionsAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: any[]) =>
    mockRequestForegroundPermissionsAsync(...args),
}));

describe('useLocationPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns granted when permission is granted', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => useLocationPermissions());

    await waitFor(() => {
      expect(result.current.granted).toBe(true);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns denied when permission is not granted', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useLocationPermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.granted).toBe(false);
    expect(result.current.error).toBe('Location permission denied');
  });

  it('handles Error instance in catch block', async () => {
    mockRequestForegroundPermissionsAsync.mockRejectedValue(new Error('GPS failure'));
    jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useLocationPermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.granted).toBe(false);
    expect(result.current.error).toBe('GPS failure');

    (console.error as jest.Mock).mockRestore();
  });

  it('handles non-Error throw in catch block', async () => {
    mockRequestForegroundPermissionsAsync.mockRejectedValue('string error');
    jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useLocationPermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.granted).toBe(false);
    expect(result.current.error).toBe('Unknown error');

    (console.error as jest.Mock).mockRestore();
  });
});
