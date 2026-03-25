// analytics.ts
//
// Helper functions for logging Firebase Analytics events.
// Import and call these at the places in the app where things happen.
//
// All custom events use the "pilot_" prefix so they are easy to filter
// in the Firebase Analytics dashboard and are separate from any test
// clicks made before the actual pilot usability testing sessions.

import analytics from '@react-native-firebase/analytics';

// --- USABILITY TESTING STATE ---
let participantId: string | null = null;
let currentTaskId: string | null = null;

export const setUsabilityState = (pId: string | null, taskId: string | null) => {
  participantId = pId;
  currentTaskId = taskId;
};

// Helper to inject current usability test context into every event
const logCustomEvent = (eventName: string, params: Record<string, any> = {}) => {
  return analytics().logEvent(eventName, {
    ...params,
    participant_id: participantId || 'none',
    task_id: currentTaskId || 'none',
  });
};

export const logTestTaskStarted = () => logCustomEvent('pilot_task_start');
export const logTestTaskEnded = (status: 'pass' | 'fail' | 'abandoned') => 
  logCustomEvent('pilot_task_end', { status });

export const logRageClick = (screenName: string) =>
  logCustomEvent('pilot_rage_click', { screen_name: screenName });

export const logDeadTap = (screenName: string, elementDescription?: string) =>
  logCustomEvent('pilot_dead_tap', { screen_name: screenName, element: elementDescription });

// Log which screen the user is on.
export const logScreenView = (screenName: string): Promise<void> =>
  analytics().logScreenView({ 
    screen_name: screenName, 
    screen_class: screenName,
  });

export const logBuildingSelected = (buildingName: string, campus: string) =>
  logCustomEvent('pilot_building_selected', { building_name: buildingName, campus });

export const logDirectionsStarted = (transportMode: string, destination: string) =>
  logCustomEvent('pilot_directions_started', { transport_mode: transportMode, destination });

export const logRoutePreview = (transportMode: string, destination: string) =>
  logCustomEvent('pilot_route_preview', { transport_mode: transportMode, destination });

export const logTransportModeChanged = (mode: string) =>
  logCustomEvent('pilot_transport_mode_changed', { mode });

export const logSearchPerformed = (queryLength: number, resultSelected: boolean) =>
  logCustomEvent('pilot_search_performed', { query_length: queryLength, result_selected: resultSelected.toString() });

export const logSearchNoResults = (queryLength: number, field: 'start' | 'destination') =>
  logCustomEvent('pilot_search_no_results', { query_length: queryLength, field });

export const logSearchAbandoned = (queryLength: number, field: 'start' | 'destination') =>
  logCustomEvent('pilot_search_abandoned', { query_length: queryLength, field });

export const logCampusToggled = (campusSelected: string) =>
  logCustomEvent('pilot_campus_toggled', { campus_selected: campusSelected });

export const logDirectionsEnded = (reason?: string, destination?: string | null) =>
  logCustomEvent('pilot_directions_ended', {
    ...(reason ? { reason } : {}),
    ...(destination ? { destination } : {}),
  });

export const logFeatureTap = (featureName: string, screenName: string) =>
  logCustomEvent('pilot_feature_tap', { feature_name: featureName, screen_name: screenName });

export const logGoogleSignIn = () => logCustomEvent('pilot_google_sign_in');
export const logGoogleSignOut = () => logCustomEvent('pilot_google_sign_out');

export const logCalendarSelected = (calendarName: string) =>
  logCustomEvent('pilot_calendar_selected', { calendar_name: calendarName });

export const logCalendarDeselected = (calendarName: string) =>
  logCustomEvent('pilot_calendar_deselected', { calendar_name: calendarName });

export const logAppearanceChanged = (theme: string) =>
  logCustomEvent('pilot_appearance_changed', { theme });

export const logBuildingDirectionsSet = (buildingName: string, role: 'start' | 'destination') =>
  logCustomEvent('pilot_building_directions_set', { building_name: buildingName, role });

export const logShuttleRouteShown = () => logCustomEvent('pilot_shuttle_route_shown');

export const logNextClassCardShown = (classTitle: string, buildingCode: string) =>
  logCustomEvent('pilot_next_class_card_shown', { class_title: classTitle, building_code: buildingCode });

export const logNextClassDirectionsTapped = (buildingCode: string) =>
  logCustomEvent('pilot_next_class_directions_tapped', { building_code: buildingCode });


export const getCurrentTaskId = () => currentTaskId;

export const logNavigationError = (expectedArea: string, actuallyWentTo: string) => {
  logCustomEvent('pilot_navigation_error', { expected: expectedArea, received: actuallyWentTo });
};
