import React from 'react';
import { render, act, waitFor, renderHook, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { AuthProvider, useAuth, User } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
    signOut: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve({
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
    })),
  },
}));

const mockUser: User = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  photo: 'https://example.com/photo.jpg',
  accessToken: 'test-access-token',
  idToken: 'test-id-token',
};

function TestConsumer() {
  const { user, isLoading, signIn, signOut } = useAuth();
  
  return (
    <>
      <Text testID="isLoading">{isLoading ? 'loading' : 'loaded'}</Text>
      <Text testID="userName">{user?.name || 'no user'}</Text>
      <Text testID="userEmail">{user?.email || 'no email'}</Text>
      <Pressable testID="signInButton" onPress={() => signIn(mockUser).catch(() => {})}>
        <Text>Sign In</Text>
      </Pressable>
      <Pressable testID="signOutButton" onPress={() => signOut().catch(() => {})}>
        <Text>Sign Out</Text>
      </Pressable>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides default values with no user', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('loaded');
      expect(getByTestId('userName').props.children).toBe('no user');
    });
  });

  it('loads saved user from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockUser)
    );
    (GoogleSignin.getCurrentUser as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('userName').props.children).toBe('Test User');
      expect(getByTestId('userEmail').props.children).toBe('test@example.com');
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@user_data');
  });

  it('clears user data if Google sign-in status is invalid', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockUser)
    );
    (GoogleSignin.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('userName').props.children).toBe('no user');
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@user_data');
  });

  it('signs in user and saves to AsyncStorage', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('loaded');
    });

    await act(async () => {
      fireEvent.press(getByTestId('signInButton'));
    });

    await waitFor(() => {
      expect(getByTestId('userName').props.children).toBe('Test User');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@user_data',
      JSON.stringify(mockUser)
    );
  });

  it('signs out user and clears AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockUser)
    );
    (GoogleSignin.getCurrentUser as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('userName').props.children).toBe('Test User');
    });

    await act(async () => {
      fireEvent.press(getByTestId('signOutButton'));
    });

    await waitFor(() => {
      expect(getByTestId('userName').props.children).toBe('no user');
    });

    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@user_data');
  });

  it('gets and updates access token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockUser)
    );
    (GoogleSignin.getCurrentUser as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });

    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBe('new-access-token');
    expect(GoogleSignin.getTokens).toHaveBeenCalled();
    
    // Check that user was updated with new tokens
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@user_data',
        expect.stringContaining('new-access-token')
      );
    });
  });

  it('handles errors when loading user data', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error('Storage error')
    );

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('loaded');
      expect(getByTestId('userName').props.children).toBe('no user');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error loading user data:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('handles errors when signing in', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('Storage error')
    );

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('loaded');
    });

    await act(async () => {
      fireEvent.press(getByTestId('signInButton'));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving user data:',
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it('handles errors when getting access token', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (GoogleSignin.getTokens as jest.Mock).mockRejectedValueOnce(
      new Error('Token error')
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error getting access token:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleSpy.mockRestore();
  });
});
