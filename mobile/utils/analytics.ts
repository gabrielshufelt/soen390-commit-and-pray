// analytics.ts
//
// Helper functions for logging Firebase Analytics events.
// Import and call these at the places in the app where things happen.
//
// All custom events use the "pilot_" prefix so they are easy to filter
// in the Firebase Analytics dashboard and are separate from any test
// clicks made before the actual pilot usability testing sessions.
//
// Firebase also tracks these for free without any extra code:
//   - session_start  -> how long a session lasts
//   - user_engagement -> time spent on each screen
//   - first_open -> tracks first time a user opens the app

import analytics from '@react-native-firebase/analytics';

// Log which screen the user is on.
// Called every time the route changes in _layout.tsx.
// Uses the built-in Firebase logScreenView method, not a custom event.
export const logScreenView = (screenName: string): Promise<void> =>
  analytics().logScreenView({ screen_name: screenName, screen_class: screenName });

// Log when a user taps a building on the map.
export const logBuildingSelected = (
  buildingName: string,
  campus: string
): Promise<void> =>
  analytics().logEvent('pilot_building_selected', {
    building_name: buildingName,
    campus,
  });

// Log when the user starts navigating to a destination.
export const logDirectionsStarted = (
  transportMode: string,
  destination: string
): Promise<void> =>
  analytics().logEvent('pilot_directions_started', {
    transport_mode: transportMode,
    destination,
  });

// Log when the user previews a route before starting it.
export const logRoutePreview = (
  transportMode: string,
  destination: string
): Promise<void> =>
  analytics().logEvent('pilot_route_preview', {
    transport_mode: transportMode,
    destination,
  });

// Log when the user switches transport mode (walking, driving, etc.).
export const logTransportModeChanged = (mode: string): Promise<void> =>
  analytics().logEvent('pilot_transport_mode_changed', { mode });

// Log when the user searches for a building.
export const logSearchPerformed = (
  queryLength: number,
  resultSelected: boolean
): Promise<void> =>
  analytics().logEvent('pilot_search_performed', {
    query_length: queryLength,
    result_selected: resultSelected.toString(),
  });

// Log when a search query returns no matching buildings.
export const logSearchNoResults = (
  queryLength: number,
  field: 'start' | 'destination'
): Promise<void> =>
  analytics().logEvent('pilot_search_no_results', {
    query_length: queryLength,
    field,
  });

// Log when the user leaves search without selecting a result.
export const logSearchAbandoned = (
  queryLength: number,
  field: 'start' | 'destination'
): Promise<void> =>
  analytics().logEvent('pilot_search_abandoned', {
    query_length: queryLength,
    field,
  });

// Log when the user switches between SGW and Loyola campuses.
export const logCampusToggled = (campusSelected: string): Promise<void> =>
  analytics().logEvent('pilot_campus_toggled', { campus_selected: campusSelected });

// Log when the user ends or cancels a route.
export const logDirectionsEnded = (
  reason?: string,
  destination?: string | null
): Promise<void> =>
  analytics().logEvent('pilot_directions_ended', {
    ...(reason ? { reason } : {}),
    ...(destination ? { destination } : {}),
  });

// Log a general button or feature tap.
// Use this for anything that does not have its own function above.
export const logFeatureTap = (
  featureName: string,
  screenName: string
): Promise<void> =>
  analytics().logEvent('pilot_feature_tap', {
    feature_name: featureName,
    screen_name: screenName,
  });

// Log when the user signs in with Google.
export const logGoogleSignIn = (): Promise<void> =>
  analytics().logEvent('pilot_google_sign_in', {});

// Log when the user signs out.
export const logGoogleSignOut = (): Promise<void> =>
  analytics().logEvent('pilot_google_sign_out', {});

// Log when the user selects a calendar.
export const logCalendarSelected = (calendarName: string): Promise<void> =>
  analytics().logEvent('pilot_calendar_selected', { calendar_name: calendarName });

// Log when the user deselects (unchecks) a calendar.
export const logCalendarDeselected = (calendarName: string): Promise<void> =>
  analytics().logEvent('pilot_calendar_deselected', { calendar_name: calendarName });

// Log when the user switches the app appearance (light, dark, system).
export const logAppearanceChanged = (theme: string): Promise<void> =>
  analytics().logEvent('pilot_appearance_changed', { theme });

// Log when the user picks a building as a route start or destination from the building modal.
// role is either 'start' or 'destination'.
export const logBuildingDirectionsSet = (
  buildingName: string,
  role: 'start' | 'destination'
): Promise<void> =>
  analytics().logEvent('pilot_building_directions_set', {
    building_name: buildingName,
    role,
  });

// Log when the user taps "Show Route" inside the shuttle schedule modal.
export const logShuttleRouteShown = (): Promise<void> =>
  analytics().logEvent('pilot_shuttle_route_shown', {});

// Log when the next class card is displayed to the user.
export const logNextClassCardShown = (
  classTitle: string,
  buildingCode: string
): Promise<void> =>
  analytics().logEvent('pilot_next_class_card_shown', {
    class_title: classTitle,
    building_code: buildingCode,
  });

// Log when the user taps "Get Directions" from the next class card.
export const logNextClassDirectionsTapped = (
  buildingCode: string
): Promise<void> =>
  analytics().logEvent('pilot_next_class_directions_tapped', {
    building_code: buildingCode,
  });
