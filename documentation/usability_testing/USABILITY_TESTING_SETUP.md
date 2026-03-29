# Usability Testing Setup

These are the steps to get the app running on your machine for the pilot usability test.
Firebase Analytics is wired in, so every interaction during the test will be tracked automatically.

All custom events use the prefix `ut_` (for example `ut_building_selected`) so they
are easy to find in the Firebase Analytics dashboard and separate from any test clicks made
before the actual testing sessions.

---

## Step 1 - Get the .env file

Make sure all variables from the #dotenv Discord channel are in the `.env` file. The path should be `soen390-commit-and-pray/.env`.

---

## Step 2 - Checkout the branch

```bash
git checkout 166-conduct-pilot-usability-testing-and-document-results
git pull
```

---

## Step 3 - Install dependencies

```bash
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

Open a terminal in the root folder and run:

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

Firebase DebugView now tracks events when running through `npx expo start`. Your events will now be tracked through Google's BigQuery.

---


## Notes

- Steps 1-5 are one-time setup per machine. After that, use Step 6 and Step 7 for each testing session.
- Do not commit `GoogleService-Info.plist` or `google-services.json`. They are in `.gitignore` already.
- Do not run the app on this branch for anything other than the usability test. All events use the
  `ut_` prefix so the data stays clean and only reflects real test sessions.

---

### Task Lifecycle Events (fired by moderator via Dev Menu)

| Event Name | Trigger | Parameters |
|---|---|---|
| `ut_task_start` | Moderator taps "Start Task Tracking" in Dev Menu | `participant_id`, `task_id` |
| `ut_task_end` | Moderator taps End (Pass/Fail/Abandoned) in Dev Menu | `status`, `nav_error_count`, `misclick_count`, `help_asked_count`, `confused_count` |

### Participant Interaction Events (fired automatically by the app)

| Event Name | Trigger | Parameters |
|---|---|---|
| `ut_building_selected` | User taps a building polygon/label on map | `building_name`, `campus` |
| `ut_building_directions_set` | User sets start or destination from building modal | `building_name`, `role` (`start`/`destination`) |
| `ut_search_performed` | User selects a destination from search suggestions | `query_length`, `result_selected` |
| `ut_search_no_results` | User types at least 2 chars and no building matches | `query_length`, `field` (`start`/`destination`) |
| `ut_search_abandoned` | User leaves search field with no result selected | `query_length`, `field` (`start`/`destination`) |
| `ut_route_preview` | User previews route before starting navigation | `transport_mode`, `destination` |
| `ut_directions_started` | User starts active navigation (search or next-class card) | `transport_mode`, `destination` |
| `ut_directions_ended` | User ends navigation or exits preview | `reason`, `destination` |
| `ut_transport_mode_changed` | User switches transport mode | `mode` |
| `ut_campus_toggled` | User switches SGW/Loyola toggle | `campus_selected` |
| `ut_feature_tap` | User taps generic tracked feature (ex: shuttle button) | `feature_name`, `screen_name` |
| `ut_shuttle_route_shown` | User taps "Show Route" in shuttle schedule modal | *(none)* |
| `ut_next_class_card_shown` | Next class card/modal becomes visible on Home screen | `class_title`, `building_code` |
| `ut_next_class_directions_tapped` | User taps "Get Directions" in next class card | `building_code` |
| `ut_google_sign_in` | User signs in with Google | *(none)* |
| `ut_google_sign_out` | User signs out from Settings | *(none)* |
| `ut_calendar_selected` | User selects a Google calendar | `calendar_name` |
| `ut_calendar_deselected` | User deselects a Google calendar | `calendar_name` |
| `ut_appearance_changed` | User changes app appearance | `theme` |
| `ut_rage_click` | 3 rapid taps anywhere on screen (auto-detected frustration signal) | `screen_name` |
| `screen_view` *(auto)* | Firebase built-in screen tracking | `firebase_screen` |
---

## Core Tasks for Full-Scale Usability Testing

The participants first need to answer 4 pre-test questions in the Google Form: https://docs.google.com/forms/d/e/1FAIpQLSdUy_8AXGgi65vBA11RUgNbP1c4q4PK_bZ8s6ZQz3K-LAqkZQ/viewform?usp=header. Once they've answered the questions, continue with the tasks.

Give these tasks to the participant one at a time as written below. Do not help them unless they are completely stuck.
Note first click success, errors, misclicks, and help requests per task.
NOTE: BEFORE HANDING DEVICE TO PARTICIPANT — set dev variables to weekday morning (8AM Monday), location to JMSB Building, and open the Usability Dev Menu (long-press the home tab) to set Participant ID and start Task 1 tracking. After each task, take the device back, open the Dev Menu, tally error counts using the +/− buttons, then tap End (Pass/Fail/Abandoned). The `ut_task_end` event logs timing and all error counts automatically.

Target sample size for full-scale testing: **12–15 participants**.
Participant IDs left: **P12, P13, P14, P15**

---

**Task 1 — Campus Orientation**
> "Find the building labeled **H** on the map and tap it. Then, look at the services and accessibility features listed, then close the card. Finally, toggle the view to the Loyola campus, then switch back to SGW."

---

**Task 2 — Searching for a Destination**
> "Tap the search bar at the top of the screen. In the **Destination** field, type **EV** and select the **EV Building** from the list. Then go back to the map and using the map, **Get Directions Starting From** the H building."

---

**Task 3 — Previewing and Starting a Route**
> "Tap the search bar. You have a start and destination set. **Preview the Route** through the search component to see the route on the map. After analyzing the route, **Exit the Route's Preview**."

---

**Task 4 — Switching Transport Modes**
> "Open the search bar and set the destination to a Loyola Campus building (for example SP). Switch the route's mode of transport to **Cycling**, then switch to **Transit** and use the Concordia shuttle. **Preview the Route**, and finally,  **Exit the Route's Preview**."

---

**Task 5 — Shuttle Schedule**
> "Open the Concordia shuttle schedule through the map. Look at the departure times. Then **View the Shuttle Route** on the map. Finally, **End the Route**."

---

**Task 6 — Sign In and Next Class**
> "Go to the **Settings** tab. Tap **Sign in with Google to sync your calendar** and complete the sign-in process. Then select a regular calendar, then a University Calendar from the list that appears. Go back to the **Home** tab and identify your next class. Note the building name and time, then **Get the Directions** to your next class."

---

**Task 7 — Indoor Directions**
> "Search the **H** building on the search bar as a destination point and open its indoor map. Using the map view, get indoor directions starting from room **H-822** to room **H-110**. Then switch to view the wheelchair accessible route. Finally, switch to the **Rooms** view, and filter for only **Elevators** on the 9th floor."

Do not forget to ask the participants to complete the Google Form: https://docs.google.com/forms/d/e/1FAIpQLSdUy_8AXGgi65vBA11RUgNbP1c4q4PK_bZ8s6ZQz3K-LAqkZQ/viewform?usp=header