import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
