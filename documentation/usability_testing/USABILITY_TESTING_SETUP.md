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

Give these tasks to the participant one at a time as written below. Do not help them unless they are completely stuck.
Record time on task with a stopwatch. Note first click success, errors, misclicks, and help requests per task.
NOTE: BEFORE HANDING DEVICE TO PARTICIPANT — set dev variables to weekday morning, location to Hall Building, and open the Usability Dev Menu (long-press "Appearance" in Settings) to set Participant ID and start Task 1 tracking.

Target sample size for full-scale testing: **12–15 participants**.

---

**Task 1 — Campus Orientation**
> "The app is showing a map of the SGW campus. Find the building labeled **H** on the map and tap it. In the card that pops up, look at the services and accessibility features listed, then close the card. Finally, use the **SGW / Loyola** toggle at the top of the map to switch to the Loyola campus, then switch back to SGW."

*Moderator notes: The Hall building polygon is centered on the SGW map. The card shows SERVICES and ACCESSIBILITY icon rows. The toggle is a pill control at the top-center of the map.*

---

**Task 2 — Searching for a Destination**
> "Tap the search bar at the top of the screen to open it. In the **Destination** field, type **EV** and select the **EV Building** from the list. Then tap any building on the map to open its info card, and tap **Get Directions From** to set it as your starting point."

*Moderator notes: The search bar is collapsed by default — the participant must tap it first. After picking EV as a destination, the bar stays open. To set a start via map, they close/dismiss the search bar, tap a different building polygon, and use the "Get Directions From" button in the building card.*

---

**Task 3 — Previewing and Starting a Route**
> "You have a start and destination set. Tap **Preview Route** in the search bar to see the route on the map. Look at the estimated time and distance shown. Then tap **Start Directions** to begin navigation. Once navigation has started, tap **End** to cancel and go back to the map."

*Moderator notes: "Preview Route" only appears when start is a building (not current location). The "Start Directions" button replaces "Preview Route" once preview is active. The "End" button is inside the navigation step card that appears at the bottom during active navigation.*

---

**Task 4 — Switching Transport Modes**
> "Open the search bar. Using the transport mode row (the icons showing a car, person, bicycle, and bus), switch to **Cycling**, then switch to **Transit**. Set any Loyola campus building as a destination and tap **Start Directions**."

*Moderator notes: Transport mode buttons are labeled Driving, Walking, Cycling, Transit. The campus can be changed inside the expanded search bar via the SGW/Loyola toggle at the top of the search bar. End directions after this task before handing off Task 5.*

---

**Task 5 — Shuttle Schedule**
> "Tap the bus icon button (🚌) on the map to open the Concordia shuttle schedule. Look at the departure times. Then tap **Show Route** to display the shuttle route on the map. When done, tap **End** to return to the normal map."

*Moderator notes: The 🚌 button is a floating button on the bottom-right of the map. "Show Route" is a button at the bottom of the shuttle modal. After tapping it the modal closes and directions are shown — "End" is in the navigation step card.*

---

**Task 6 — Sign In and Next Class**
> "Go to the **Settings** tab (the gear icon at the bottom). Tap **Sign in with Google to sync your calendar** and complete the sign-in with your Google account. Then select your class calendar from the list that appears. Go back to the **Home** tab and look at the card that appears near the bottom of the screen — it should show your next class. Note the building name and time, then tap **Get Directions**."

*Moderator notes: The next class card appears above the search bar on the Home screen once a calendar is connected. It only shows if there is a class scheduled today and in the future (dev time override should be set to morning on a weekday). The "Get Directions" button is inside the card.*

---

**Task 7 — Indoor Directions** *(include only if the indoor map feature is available)*
> "Tap the **H** building on the map and open its info card. From there, open the indoor map. Find room **H-110**, request the shortest path to it, then switch to the accessible route. Try navigating to a room on a different floor."

*Moderator notes: Only include this task if the indoor map feature has been merged and is accessible from the building modal.*

---

**Task 8 — Points of Interest** *(include only if the indoor POI feature is available)*
> "Inside the Hall building's indoor map, find the nearest **elevator**, **washroom**, and **water fountain**. Then go back to the main map and find a nearby outdoor point of interest and get directions to it."

*Moderator notes: Only include this task if the indoor POI and outdoor POI features have been merged.*


