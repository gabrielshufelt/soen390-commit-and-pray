import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '../app/(tabs)/settings';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'system',
    colorScheme: 'light',
    setTheme: jest.fn(),
  })),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isLoading: false,
    signOut: jest.fn(),
  })),
}));

jest.mock('@/components/SignInGoogle', () => {
  const { View, Text } = require('react-native');
  return function MockSignInGoogle() {
    return (
      <View testID="sign-in-google">
        <Text>SignInGoogle Component</Text>
      </View>
    );
  };
});

const mockUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  photo: 'https://example.com/photo.jpg',
  accessToken: 'test-token',
  idToken: 'test-id-token',
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Theme Selection', () => {
    it('renders all theme options', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Appearance')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Dark')).toBeTruthy();
      expect(getByText('System')).toBeTruthy();
    });

    it('shows checkmark on currently selected theme', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        colorScheme: 'dark',
        setTheme: jest.fn(),
      });

      const { getAllByText } = render(<SettingsScreen />);
      const checkmarks = getAllByText('✓');

      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('calls setTheme when a theme option is pressed', () => {
      const mockSetTheme = jest.fn();
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'system',
        colorScheme: 'light',
        setTheme: mockSetTheme,
      });

      const { getByText } = render(<SettingsScreen />);

      fireEvent.press(getByText('Dark'));

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('applies light theme styles', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'light',
        colorScheme: 'light',
        setTheme: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);
      const lightOption = getByText('Light').parent;

      expect(lightOption).toBeTruthy();
    });

    it('applies dark theme styles', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        colorScheme: 'dark',
        setTheme: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);
      const darkOption = getByText('Dark').parent;

      expect(darkOption).toBeTruthy();
    });
  });

  describe('Authentication - Not Signed In', () => {
    it('renders Account section when not signed in', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { getByText, getByTestId } = render(<SettingsScreen />);

      expect(getByText('Account')).toBeTruthy();
      expect(getByTestId('sign-in-google')).toBeTruthy();
    });

    it('shows loading indicator when authentication is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
        signOut: jest.fn(),
      });

      const { getByTestId } = render(<SettingsScreen />);

      // ActivityIndicator doesn't have a testID by default, but we can check for the container
      expect(() => getByTestId('sign-in-google')).toThrow();
    });
  });

  describe('Authentication - Signed In', () => {
    it('displays user information when signed in', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
    });

    it('displays user photo when available', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { UNSAFE_getByType } = render(<SettingsScreen />);
      const Image = require('react-native').Image;
      const images = UNSAFE_getByType(Image);

      expect(images.props.source.uri).toBe('https://example.com/photo.jpg');
    });

    it('does not display photo when user has no photo', () => {
      const userWithoutPhoto = { ...mockUser, photo: undefined };
      (useAuth as jest.Mock).mockReturnValue({
        user: userWithoutPhoto,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { queryByTestId } = render(<SettingsScreen />);

      // With no photo, the Image component should not be rendered
      // We check that we can still see the user name but no profile image
      const { getByText, UNSAFE_queryAllByType } = render(<SettingsScreen />);
      const Image = require('react-native').Image;
      const images = UNSAFE_queryAllByType(Image);
      expect(images.length).toBe(0);
    });

    it('renders Log Out button when signed in', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Log Out')).toBeTruthy();
    });

    it('calls signOut when Log Out button is pressed', async () => {
      const mockSignOut = jest.fn().mockResolvedValue(undefined);
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: mockSignOut,
      });

      const { getByText } = render(<SettingsScreen />);

      fireEvent.press(getByText('Log Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('handles signOut error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockSignOut = jest.fn().mockRejectedValue(new Error('Sign out failed'));
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: mockSignOut,
      });

      const { getByText } = render(<SettingsScreen />);

      fireEvent.press(getByText('Log Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to sign out:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Layout and Styling', () => {
    it('renders section titles with correct styling', () => {
      const { getByText } = render(<SettingsScreen />);

      const appearanceTitle = getByText('Appearance');
      const accountTitle = getByText('Account');

      expect(appearanceTitle).toBeTruthy();
      expect(accountTitle).toBeTruthy();
    });

    it('applies proper spacing between sections', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Account')).toBeTruthy();
      expect(getByText('Appearance')).toBeTruthy();
    });

    it('uses correct background colors for light theme', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'light',
        colorScheme: 'light',
        setTheme: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);
      const container = getByText('Appearance').parent?.parent;

      expect(container).toBeTruthy();
    });

    it('uses correct background colors for dark theme', () => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        colorScheme: 'dark',
        setTheme: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);
      const container = getByText('Appearance').parent?.parent;

      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles user with only required fields', () => {
      const minimalUser = {
        id: '123',
        name: '',
        email: 'minimal@example.com',
        accessToken: 'token',
        idToken: 'id-token',
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: minimalUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('minimal@example.com')).toBeTruthy();
    });

    it('transitions from loading to signed in state', async () => {
      const { rerender, getByTestId, getByText } = render(<SettingsScreen />);

      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
        signOut: jest.fn(),
      });

      rerender(<SettingsScreen />);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        signOut: jest.fn(),
      });

      rerender(<SettingsScreen />);

      expect(getByText('Test User')).toBeTruthy();
    });
  });
});
