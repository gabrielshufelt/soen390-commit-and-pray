import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

function TestConsumer() {
  const { theme, colorScheme, setTheme } = useTheme();
  return (
    <>
      <Text testID="theme">{theme}</Text>
      <Text testID="colorScheme">{colorScheme}</Text>
      <Text testID="setTheme" onPress={() => setTheme('dark')}>Set Dark</Text>
    </>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides default theme values', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme').props.children).toBe('system');
    });
  });

  it('loads saved theme from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme').props.children).toBe('dark');
      expect(getByTestId('colorScheme').props.children).toBe('dark');
    });
  });

  it('saves theme to AsyncStorage when changed', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme').props.children).toBe('system');
    });

    await act(async () => {
      fireEvent.press(getByTestId('setTheme'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@theme_preference', 'dark');
  });

  it('throws error when useTheme is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
  });
});
