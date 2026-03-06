// DEV OVERRIDES
// Set to "null" to use real values

// Override the current time. Useful for demoing the next class modal.
// Set to null to use the real clock.
// Example: new Date('2026-03-09T12:00:00') puts the app at March 9 at noon.

export const DEV_OVERRIDE_TIME: Date | null = new Date('2026-03-09T08:44:59'); // UNCOMMENT TO USE OVERRIDE TIME
// export const DEV_OVERRIDE_TIME: Date | null = null; // UNCOMMENT TO USE REAL TIME



// Override GPS location. 
// Set to null to use real device location.
// Common spots:
// Hall (H)   -> { latitude: 45.4971, longitude: -73.5789 };
// JMSB (MB)  -> { latitude: 45.4953, longitude: -73.5790 };
// Loyola CJ  -> { latitude: 45.4576, longitude: -73.6396 };

export const DEV_OVERRIDE_LOCATION: { latitude: number; longitude: number } | null = 
{ latitude: 45.4971, longitude: -73.5789 }; // UNCOMMENT TO USE OVERRIDE LOCATION
// export const DEV_OVERRIDE_LOCATION: null = null; // UNCOMMENT TO USE REAL LOCATION