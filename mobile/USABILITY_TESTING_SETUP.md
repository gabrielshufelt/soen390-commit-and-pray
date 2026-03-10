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
- **Xcode** (from the Mac App Store, latest version)
- **CocoaPods** -> run `sudo gem install cocoapods` if you do not have it
- **Git**

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

## Step 5 - Run prebuild

This generates the native iOS and Android folders with Firebase wired in.
You only need to do this once (or again if the native config changes).

```bash
npx expo prebuild --clean
```

---

## Step 6 - Build the app (first time only)

Run this once to compile the native iOS app:

```bash
npx expo run:ios
```

This builds the app and installs it on the simulator. You only need to do this once.
If asked which simulator to use, pick **iPhone 16** or **iPhone 17 Pro**.

---

## Step 7 - Run the app for usability testing (use this every time)

**This is the only way that works with Firebase DebugView. Do not skip step 7a.**

### Step 7a - Start Metro (in VS Code terminal)

Open a terminal in the `mobile/` folder and run:

```bash
npx expo start
```

Keep this terminal open the entire time. Metro is the JavaScript bundler — the app cannot
load without it running.

### Step 7b - Launch the app in Xcode

1. Open the project in Xcode:
   ```bash
   open ios/mobile.xcworkspace
   ```
2. Select your simulator at the top (iPhone 16 or iPhone 17 Pro)
3. Press **⌘R** to run

The app will launch on the simulator. Firebase DebugView events will only appear when the
app is launched this way (Metro running + Xcode ⌘R). Running via `npx expo run:ios` alone
will not send events to DebugView.

### Step 7c - Open Firebase DebugView

Go to [Firebase Console → Analytics → DebugView](https://console.firebase.google.com/project/soen390-usability/analytics/app/ios:com.commitandpray.soen390project/debugview)

Your simulator will appear in the device dropdown after a few seconds. `pilot_` events will
stream in real time as the participant interacts with the app.

---

## Notes

- Steps 4, 5, and 6 only need to be done once per machine. After that, just do Step 7 every time.
- If you run into a CocoaPods error, try `sudo gem install cocoapods` and redo step 5.
- Do not commit `GoogleService-Info.plist` or `google-services.json`. They are in `.gitignore` already.
- Do not run the app on this branch for anything other than the usability test. All events use the
  `pilot_` prefix so the data stays clean and only reflects real test sessions.

---

## Tracked Events in Firebase DebugView

All custom events use the `pilot_` prefix. They appear by name in DebugView as the participant interacts with the app.
Screen views are tracked automatically by Firebase (no `pilot_` prefix) whenever the participant navigates between screens.

| Event Name | What It Tracks |
|---|---|
| `pilot_building_selected` | Participant tapped a building marker on the map. Includes `building_name` and `campus`. |
| `pilot_directions_started` | Participant started navigation to a building. Includes `destination` and `campus`. |
| `pilot_route_preview` | Participant previewed a route before starting navigation. Includes `destination` and `transport_mode`. |
| `pilot_directions_ended` | Participant cancelled or finished a route. Includes `destination`. |
| `pilot_transport_mode_changed` | Participant switched between walking, driving, or transit. Includes `mode`. |
| `pilot_search_performed` | Participant used the search bar. Includes `query` and `results_count`. |
| `pilot_campus_toggled` | Participant switched the map between SGW and Loyola. Includes `campus` (the new campus shown). |
| `pilot_feature_tap` | Participant tapped a general UI feature (shuttle button, etc.). Includes `feature_name`. |
| `pilot_building_directions_set` | Participant set a building as their destination from the building modal. Includes `building_name`. |
| `pilot_shuttle_route_shown` | Participant opened the shuttle schedule modal. No extra parameters. |
| `pilot_google_sign_in` | Participant signed in with Google in the Settings tab. No extra parameters. |
| `pilot_google_sign_out` | Participant signed out in the Settings tab. No extra parameters. |
| `pilot_calendar_selected` | Participant selected a Google Calendar to connect. Includes `calendar_id` and `calendar_name`. |
| `pilot_calendar_deselected` | Participant deselected a connected Google Calendar. Includes `calendar_id` and `calendar_name`. |
| `pilot_appearance_changed` | Participant changed the app theme. Includes `mode` (`light`, `dark`, or `system`). |
| `screen_view` *(auto)* | Firebase built-in. Fires on every screen navigation. Includes `firebase_screen` (the route name). |

---

## Core Tasks for Pilot Usability Testing

Give these tasks to the participant one at a time. Do not help them unless they are completely stuck.
Note how long each task takes and whether they completed it on their own.

**Task 1 - Find a building on the map**
"You are on the SGW campus. Find the Hall building on the map and tap on it to see its details."

**Task 2 - Search for a building**
"You want to go to the EV building. Use the search bar to find it and set it as your destination."

**Task 3 - Get walking directions**
"Get walking directions from your current location to the EV building."

**Task 4 - Switch transport mode**
"You changed your mind and want to drive instead of walk. Switch the transport mode to driving."

**Task 5 - End a route**
"You no longer need directions. Cancel the current route."

**Task 6 - Switch to Loyola campus**
"Switch the map to show the Loyola campus instead of SGW."

**Task 7 - View the shuttle schedule**
"You want to take the Concordia shuttle between campuses. Find and open the shuttle schedule."

**Task 8 - Sign in with Google**
"Go to the Settings tab and sign in with your Google account."

**Task 9 - Connect a calendar**
"After signing in, find and select your main Google Calendar so the app can show your next class."

**Task 10 - Change the app appearance**
"Switch the app to dark mode."

