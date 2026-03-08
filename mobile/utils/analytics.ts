// analytics.ts
//
// Helper functions for logging Firebase Analytics events.
// Import and call these at the places in the app where things happen.
//
// Firebase also tracks these for free without any extra code:
//   - session_start  -> how long a session lasts
//   - user_engagement -> time spent on each screen
//   - first_open -> tracks first time a user opens the app

import analytics from '@react-native-firebase/analytics';

// Log which screen the user is on.
// Called every time the route changes in _layout.tsx.
export const logScreenView = (screenName: string): Promise<void> =>
  analytics().logScreenView({ screen_name: screenName, screen_class: screenName });

// Log when a user taps a building on the map.
export const logBuildingSelected = (
  buildingName: string,
  campus: string
): Promise<void> =>
  analytics().logEvent('building_selected', {
    building_name: buildingName,
    campus,
  });

// Log when the user starts navigating to a destination.
export const logDirectionsStarted = (
  transportMode: string,
  destination: string
): Promise<void> =>
  analytics().logEvent('directions_started', {
    transport_mode: transportMode,
    destination,
  });

// Log when the user previews a route before starting it.
export const logRoutePreview = (
  transportMode: string,
  destination: string
): Promise<void> =>
  analytics().logEvent('route_preview', {
    transport_mode: transportMode,
    destination,
  });

// Log when the user switches transport mode (walking, driving, etc.).
export const logTransportModeChanged = (mode: string): Promise<void> =>
  analytics().logEvent('transport_mode_changed', { mode });

// Log when the user searches for a building.
export const logSearchPerformed = (
  queryLength: number,
  resultSelected: boolean
): Promise<void> =>
  analytics().logEvent('search_performed', {
    query_length: queryLength,
    result_selected: resultSelected.toString(),
  });

// Log when the user switches between SGW and Loyola campuses.
export const logCampusToggled = (campusSelected: string): Promise<void> =>
  analytics().logEvent('campus_toggled', { campus_selected: campusSelected });

// Log when the user ends or cancels a route.
export const logDirectionsEnded = (): Promise<void> =>
  analytics().logEvent('directions_ended', {});

// Log a general button or feature tap.
// Use this for anything that does not have its own function above.
export const logFeatureTap = (
  featureName: string,
  screenName: string
): Promise<void> =>
  analytics().logEvent('feature_tap', {
    feature_name: featureName,
    screen_name: screenName,
  });

// Log when the user signs in with Google.
export const logGoogleSignIn = (): Promise<void> =>
  analytics().logEvent('google_sign_in', {});

// Log when the user signs out.
export const logGoogleSignOut = (): Promise<void> =>
  analytics().logEvent('google_sign_out', {});

// Log when the user selects a calendar.
export const logCalendarSelected = (calendarName: string): Promise<void> =>
  analytics().logEvent('calendar_selected', { calendar_name: calendarName });

// Log when the user deselects (unchecks) a calendar.
export const logCalendarDeselected = (calendarName: string): Promise<void> =>
  analytics().logEvent('calendar_deselected', { calendar_name: calendarName });

// Log when the user switches the app appearance (light, dark, system).
export const logAppearanceChanged = (theme: string): Promise<void> =>
  analytics().logEvent('appearance_changed', { theme });
