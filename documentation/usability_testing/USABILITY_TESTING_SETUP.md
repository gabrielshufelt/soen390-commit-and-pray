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
| `pilot_next_class_card_shown` | Next class card/modal becomes visible on Home screen (Task 17 validation; class time is visual only) | `class_title`, `building_code` |
| `pilot_next_class_directions_tapped` | User taps “Get Directions” in next class card | `building_code` |
| `pilot_google_sign_in` | User signs in with Google | *(none)* |
| `pilot_google_sign_out` | User signs out from Settings | *(none)* |
| `pilot_calendar_selected` | User selects a Google calendar | `calendar_name` |
| `pilot_calendar_deselected` | User deselects a Google calendar | `calendar_name` |
| `pilot_appearance_changed` | User changes app appearance | `theme` |
| `screen_view` *(auto)* | Firebase built-in screen tracking | `firebase_screen` |

---

## Core Tasks for Full-Scale Usability Testing

Give these tasks to the participant one at a time. Do not help them unless they are completely stuck.
Note how long each task takes and whether they completed it on their own.
NOTE: SET DEV VARIABLES TO WEEKDAY IN THE MORNING AND LOCATION TO HALL BUILDING

Target sample size for full-scale testing: **12–15 participants**.

These tasks are intentionally merged into realistic end-to-end user flows (5–8 total tasks as requested).

**Task 1 - Campus orientation flow**
"On SGW, identify your current building, open one building info card (services/accessibility), then switch to Loyola and back to SGW."

**Task 2 - Destination setup flow**
"Find EV using search, then set route start and destination using a mix of map taps and search selection."

**Task 3 - Outdoor navigation flow**
"Preview a walking route, start navigation, and then end/cancel the route."

**Task 4 - Transportation and cross-campus flow**
"Switch transport mode (cycling and transit), then get directions between an SGW building and a Loyola building."

**Task 5 - Shuttle flow**
"Open the Concordia shuttle schedule and tap Show Shuttle Route, then return to map navigation."

**Task 6 - Account and next-class flow**
"Sign in with Google, select your class calendar, identify next class location/time from the next-class card, then tap Get Directions."

**Task 7 - Indoor directions flow**
"From a building context, open indoor map, locate a room, request shortest path, then request accessible route and try a multi-floor path."

**Task 8 - Points of interest flow**
"Locate indoor points of interest (elevator/washroom/water fountain), then find a nearby outdoor POI and get directions to it."


