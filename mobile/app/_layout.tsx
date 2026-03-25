import { Stack, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { CalendarProvider } from '../context/CalendarContext';
import { UsabilityOverlay } from '../components/usabilityOverlay';
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { logScreenView } from '../utils/analytics';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

// Tracks the current screen and logs it to Firebase Analytics every time the
// route changes. This gives us a page view count for each screen.
function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    logScreenView(pathname);
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CalendarProvider>
          <UsabilityOverlay>
            {/* ScreenTracker sits inside the router so usePathname works */}
            <ScreenTracker />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </UsabilityOverlay>
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

