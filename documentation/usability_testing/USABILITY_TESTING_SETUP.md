# Usability Testing Setup

These are the steps to get the app running on your machine for the pilot usability test.
Firebase Analytics is wired in, so every interaction during the test will be tracked automatically.

All custom events use the prefix `pilot_` (for example `pilot_building_selected`) so they
are easy to find in the Firebase Analytics dashboard and separate from any test clicks made
before the actual testing sessions.

---

## Before You Start

Make sure you have these installed:

- **Node.js 20+** -> https://nodejs.org
- **Git**
- **Xcode** (from the Mac App Store, latest version)
- **CocoaPods** -> run `sudo gem install cocoapods` if you do not have it
- **Expo Go** on your phone (optional, if you want to run on a physical device)
---

## Step 1 - Get the .env file

Ask Jeremy for the `.env` file. Place it inside the `mobile/` folder.
The path should be `soen390-commit-and-pray/mobile/.env`.

---

## Step 2 - Checkout the branch

```bash
git checkout 166-conduct-pilot-usability-testing-and-document-results
git pull
```

---

## Step 3 - Install dependencies

```bash
cd mobile
npm install
```

---

## Step 4 - Decode Firebase config files

This reads the base64 values from .env and writes the actual Firebase config files.
You only need to do this once per machine.

```bash
source .env
echo "$FIREBASE_IOS_CONFIG_BASE64" | base64 --decode > GoogleService-Info.plist
echo "$FIREBASE_ANDROID_CONFIG_BASE64" | base64 --decode > google-services.json
```

---

## Step 5 - One-time native setup (recommended)

If this is your first time on this machine (or native config changed), run:

```bash
npx expo prebuild --clean
npx expo run:ios
```

This prepares/builds the native app once so simulator/device launches are smooth.

---

## Step 6 - Run the app for usability testing (use this every time)

Open a terminal in the `mobile/` folder and run:

```bash
npx expo start
```

Keep this terminal open the entire time. Metro is the JavaScript bundler — the app cannot
load without it running.

Before launching, press **`s`** in the Expo terminal to switch to development mode.

Then launch the app using one of the following:

- Press **`i`** in the Expo terminal to open iOS Simulator
- Press **`a`** in the Expo terminal to open Android Emulator
- Or scan the QR code with Expo Go on a physical device

Firebase DebugView now tracks events when running through `npx expo start`.

---

## Step 7 - Open Firebase DebugView

Go to [Firebase Console → Analytics → DebugView](https://console.firebase.google.com/project/soen390-usability/analytics/app/ios:com.commitandpray.soen390project/debugview)

Your active device/session will appear in the device dropdown after a few seconds. `pilot_` events will
stream in real time as the participant interacts with the app.

---

## Notes

- Steps 1-5 are one-time setup per machine. After that, use Step 6 and Step 7 for each testing session.
- Do not commit `GoogleService-Info.plist` or `google-services.json`. They are in `.gitignore` already.
- Do not run the app on this branch for anything other than the usability test. All events use the
  `pilot_` prefix so the data stays clean and only reflects real test sessions.

---

## Tracked Events in Firebase DebugView

All custom events use the `pilot_` prefix. They appear by name in DebugView as the participant interacts with the app.
Screen views are tracked automatically by Firebase (no `pilot_` prefix) whenever the participant navigates between screens.

| Event Name | Trigger | Parameters |
|---|---|---|
| `pilot_building_selected` | User taps a building polygon/label on map | `building_name`, `campus` |
| `pilot_building_directions_set` | User sets start or destination from building modal | `building_name`, `role` (`start`/`destination`) |
| `pilot_search_performed` | User selects a destination from search suggestions | `query_length`, `result_selected` |
| `pilot_search_no_results` | User types at least 2 chars and no building matches | `query_length`, `field` (`start`/`destination`) |
| `pilot_search_abandoned` | User leaves search field with no result selected | `query_length`, `field` (`start`/`destination`) |
| `pilot_route_preview` | User previews route before starting navigation | `transport_mode`, `destination` |
| `pilot_directions_started` | User starts active navigation (search or next-class card) | `transport_mode`, `destination` |
| `pilot_directions_ended` | User ends navigation or exits preview | `reason`, `destination` |
| `pilot_transport_mode_changed` | User switches transport mode | `mode` |
| `pilot_campus_toggled` | User switches SGW/Loyola toggle | `campus_selected` |
| `pilot_feature_tap` | User taps generic tracked feature (ex: shuttle button) | `feature_name`, `screen_name` |
| `pilot_shuttle_route_shown` | User taps “Show Route” in shuttle schedule modal | *(none)* |
| `pilot_next_class_card_shown` | Next class card/modal becomes visible on Home screen (Task 15 validation; class time is visual only) | `class_title`, `building_code` |
| `pilot_next_class_directions_tapped` | User taps “Get Directions” in next class card | `building_code` |
| `pilot_google_sign_in` | User signs in with Google | *(none)* |
| `pilot_google_sign_out` | User signs out from Settings | *(none)* |
| `pilot_calendar_selected` | User selects a Google calendar | `calendar_name` |
| `pilot_calendar_deselected` | User deselects a Google calendar | `calendar_name` |
| `pilot_appearance_changed` | User changes app appearance | `theme` |
| `screen_view` *(auto)* | Firebase built-in screen tracking | `firebase_screen` |

---

## Core Tasks for Pilot Usability Testing

Give these tasks to the participant one at a time. Do not help them unless they are completely stuck.
Note how long each task takes and whether they completed it on their own.
NOTE: SET DEV VARIABLES TO WEEKDAY IN THE MORNING AND LOCATION TO HALL BUILDING

Tasks 1–16 cover outdoor navigation, campus exploration, and account features.
Tasks 17–21 cover indoor directions functionality.
Tasks 22–26 cover cross-campus directions, next-class navigation, indoor/outdoor points of interest.

**Task 1 - Find a building on the map**
"You are on the SGW campus. Find the Hall building on the map and tap on it to see its details, then close the details."

**Task 2 - Inspect building details pop-up**
"Open the LB building card and identify at least one service and one accessibility feature, then close the building info card."

**Task 3 - Search for a building**
"You want to go to the EV building. Use the search bar to find it and set it as your destination. (GO BACK TO MAP AFTERWARDS)"

**Task 4 - Set start point from map**
"Click on Hall building on the map, and set your route start point to that building instead of your current location."

**Task 5 - Get walking directions**
"Get walking directions from your current location to the EV building. (END DIRECTIONS AFTER)"

**Task 6 - Preview a route before starting**
"(TOGGLE SGW CAMPUS FIRST) Tap the search bar, set start point to Hall building and destination point to FC building, and preview the route without starting turn-by-turn navigation."

**Task 7 - Switch transport mode to driving**
"You changed your mind and want to bike instead. Switch the transport mode to cycling."

**Task 8 - Switch transport mode to transit**
"Change the mode from cycling to public transit."

**Task 9 - End a route**
"You no longer need directions. Cancel the current route."

**Task 10 - Switch to Loyola campus**
"Switch the map to show the Loyola campus instead of SGW."

**Task 11 - View the shuttle schedule**
"You want to take the Concordia shuttle between campuses. Find and open the shuttle schedule."

**Task 12 - Show shuttle route**
"Inside the shuttle schedule, tap Show Shuttle Route to display the inter-campus shuttle path and then click End."

**Task 13 - Sign in with Google**
"Go to the Settings tab and sign in with your Google account."

**Task 14 - Connect a calendar and launch next-class directions**
"After signing in, find and select your main Google Calendar for school."

**Task 15 - View next class location and time**
"Find the next class modal/card and identify the class location and class time information shown."

**Task 16 - Change app appearance**
"Switch the app appearance to dark mode, then return it to system mode."

**Task 17 (Indoor Directions) - Find indoor map entry point**
"From a building context, identify where you expect to open indoor maps for a specific floor."

**Task 18 (Indoor Directions) - Locate a room on a floor**
"Attempt to locate a target room on a specific floor and describe where the flow is unclear."

**Task 19 (Indoor Directions) - Shortest indoor path expectation**
"Attempt to request the shortest indoor path between two rooms on the same floor."

**Task 20 (Indoor Directions) - Accessible indoor route expectation**
"Attempt to request an accessibility-friendly route (e.g., elevator-preferred)."

**Task 21 (Indoor Directions) - Multi-floor / building indoor route expectation**
"Attempt to get indoor directions across floors or between two buildings and describe missing steps."

**Task 22 - Get outdoor directions between campuses**
"Get directions from a building on the SGW campus to a building on the Loyola campus."

**Task 23 - Launch directions from next-class card**
"When the next class card appears on the home tab, tap 'Get Directions' to view directions to your next class."

**Task 24 - Locate indoor points of interest**
"Explore the indoor map and locate points of interest like washrooms, elevators, or water fountains for a specific floor."

**Task 25 - View nearby outdoor points of interest**
"View nearby outdoor points of interest (restaurants, coffee shops) displayed on the map."

**Task 26 - Get directions to an outdoor POI**
"Select a nearby outdoor point of interest and get directions to it."


