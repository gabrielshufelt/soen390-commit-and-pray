## Issue 1 [ALREADY DONE]
Issue: https://github.com/gabrielshufelt/soen390-commit-and-pray/issues/241

PR: https://github.com/gabrielshufelt/soen390-commit-and-pray/pull/259

**Title:** `[UT-IMP] Add "Exit Preview" Button Directly on the Map View`

**Label:** `usability-testing-improvements`

**Description:**

Currently, when a user previews a route, the only way to exit the preview is by reopening the search bar  and finding the "Exit Preview" button inside it. There is no persistent button or indicator on the map itself that lets the user cancel the preview without going back into the search component.

# Goal

Add a visible, always-accessible "Exit Preview" button directly on the map when a route preview is active, so that users can cancel the preview without needing to reopen the search bar.

# Problem

The current flow to exit a preview looks like this:

- Preview route --> route polyline appears on the map
- User wants to exit --> has to reopen the search bar sheet --> find and tap "Exit Preview" inside the sheet

This is not intuitive. 5 out of 12 participants mentioned this as a source of confusion during testing, and it contributed to high confusion and error counts on Tasks 3 and 4.

# Proposed Improvements

1. Add a floating "Exit Preview" button or banner on the map that is always visible when a route preview is active
   - Could be a floating X button at the top or bottom of the map
   - Or a banner/pill at the top of the screen saying something like "Previewing Route -- Tap to Exit"
   - Either way, it should dismiss the preview without requiring the user to open the search bar

2. Add a subtle visual indicator on the map while in preview mode so users know they are in a "preview state" (e.g. a different colored route line, a label on the polyline)

# Expected Outcome

- Users can exit a route preview in 1 tap directly from the map
- No need to reopen the search bar to find the exit button
- Preview state is visually distinguishable from active navigation

---

## Issue 2 [CREATED]

**Title:** `[UT-IMP] Redesign the Indoor Navigation Flow for Improved Usability`

**Label:** `usability-testing-improvements`

# Description

The indoor navigation feature currently has significant usability issues. Task 7 (the indoor directions task) was by far the most problematic task in our full-scale usability test, with an average completion time of 150.5 seconds (nearly 3x the next slowest task), 85 total errors, 49 rage clicks, and 4 out of 12 participants specifically mentioning indoor navigation as a source of confusion.

# Goal

Redesign the indoor navigation flow to make it clearer and more intuitive, focusing on floor switching, direction input, and route progress feedback.

# Problem

Several different aspects of the indoor UI contributed to confusion:

- Floor switching was not immediately obvious to users
- Setting a start and end room for directions required multiple taps and it was not always clear what the current state was (e.g. has the start been set? do I need to tap the room first?)
- Once a route was found, there was no clear sense of "progress" through the route (especially for cross-floor routes)
- The accessible routing option was hard to find (see separate issue)

# Proposed Improvements

1. Make floor switching more prominent
   - The current prev/next arrow buttons for switching floors could be replaced with or supplemented by a visible floor selector (e.g. a pill or tab bar showing all available floors so users can jump directly to any floor)

2. Make direction inputs clearer
   - Add visual guidance or step-by-step prompts to explain how to set the start and end rooms (e.g. "Tap a room to set as your start" then "Now tap a room to set as your destination")
   - Show the currently selected start/end rooms more visibly while the user is picking them

3. Add breadcrumb/progress indicators for the route
   - Show something like "Floor 8 --> Floor 1" or a step counter so users understand where they are in the route
   - For cross-floor transitions, make it more obvious when the user needs to switch floors (e.g. a more visible callout, not just a small text block)

# Expected Outcome

- Users can find and use indoor directions without confusion
- Floor switching is obvious and accessible
- Direction setup is self-explanatory with minimal help needed
- Cross-floor routes are easy to follow

---

## Issue 3 [CREATED]

**Title:** `[UT-IMP] Replace the Indoor Route Options Menu Icon with a Wheelchair Icon`

**Label:** `usability-testing-improvements`

# Description

The indoor map has an accessibility routing option that allows users to get a wheelchair-accessible route (prioritizing ramps, avoiding stairs, preferring elevators). However, this option is hidden behind a generic hamburger/three-lines menu icon in the indoor map header. There is no wheelchair symbol or any other visual indicator that suggests the button is related to accessibility.

# Goal

Make the accessible routing option immediately recognizable by replacing the generic menu icon with a wheelchair symbol, or by adding a wheelchair icon alongside it.

# Problem

3 out of 12 participants specifically mentioned they could not find the "wheelchair accessible" routing option during testing. Some representative feedback:

- "Finding the disabled option"
- "Couldn't figure out how to switch floors and view accessible routing"
- "Switching the three lines for accessibility to a wheelchair image" (participant suggestion)

The accessible routing toggle lives in `IndoorRouteOptionsModal`. The modal is opened by a hamburger icon button in the indoor map header. Since the button looks like a general settings/menu button, users who are looking for accessibility options have no reason to tap it.

# Proposed Improvements

1. Replace the three-lines hamburger icon with a wheelchair icon (or add a wheelchair icon alongside it)
   - A standard wheelchair accessibility symbol is immediately recognizable and universally understood
   - This is a small change but would make the option much more discoverable

2. Optionally, rename the modal to make it clearer what it does
   - "Route Options" --> "Accessibility & Route Options" or similar

3. Consider exposing a quick-toggle wheelchair accessible button directly in the indoor map header without requiring the modal, since it was the most common accessibility need observed

# Expected Outcome

- Users can immediately identify where to find the accessible routing option
- No confusion about what the header button does
- Wheelchair-accessible routing is actually used by users who need it

---

## Issue 4 [CREATED]

**Title:** `[UT-FIX] Fix Shuttle "Show Route on Map" to Display a Preview Instead of Starting Active Navigation`

**Label:** `usability-testing-improvements`

# Description

When a user opens the shuttle schedule modal and taps "Show Shuttle Route on Map", the app starts full active turn-by-turn navigation from the Loyola bus stop to the SGW bus stop. This is not the expected behavior, the user just wants to see where the shuttle goes on the map, not get turn-by-turn directions.

# Goal

Change the "Show Shuttle Route on Map" button to display the shuttle route as a map preview, rather than launching full active navigation.

# Problem

In `handleShowShuttleRoute` (in `app/(tabs)/index.tsx`), the button calls `startDirections()` which sets the route as active (turn-by-turn mode). This means:

- The search bar disappears
- The navigation steps panel appears
- The user is now "navigating" from Loyola to SGW, which is not what they asked for

The correct behavior would be to call `previewDirections()` instead, which shows the route overlay on the map without starting navigation.

Task 5 had 9 total errors across all participants, and P12 failed the task entirely. The confusion was partly caused by the app unexpectedly launching full navigation.

# Proposed Improvements

1. Change `handleShowShuttleRoute` to call `previewDirections()` (or equivalent preview logic) instead of `startDirections()`
   - This will show the shuttle route as a polyline on the map without hiding the UI and entering active navigation mode

2. Make sure the shuttle route preview can be exited clearly (ties into Issue 1 about Exit Preview visibility)

3. Optionally, show the shuttle route as a static overlay (non-interactive, no "navigation" state at all) since the user is just exploring the schedule

# Expected Outcome

- Tapping "Show Shuttle Route on Map" shows the shuttle path as a visual overlay on the map
- The app does not enter active navigation mode unexpectedly
- Users can view the route and return to normal app usage without confusion

---

## Issue 5 [ALREADY DONE]
Issue: https://github.com/gabrielshufelt/soen390-commit-and-pray/issues/248

PR: https://github.com/gabrielshufelt/soen390-commit-and-pray/pull/249

**Title:** `[UT-FIX] Ensure Route Lines and Pop-ups Are Cleared Automatically When Navigation Ends`

**Label:** `usability-testing-improvements`

**Description:**

During usability testing, some participants reported that route lines and pop-ups remained on the screen even after navigation was ended or a route was exited. This created a cluttered map experience where leftover overlays from a previous route were still visible.

# Goal

Ensure that all route-related overlays (polylines, pop-ups, info cards, banners) are fully cleared from the map as soon as the user ends a route or exits navigation.

# Problem

2 out of 12 participants specifically mentioned this issue. Some representative feedback:

- "Too many pop ups and lines that cannot be removed"

The issue may be related to certain edge cases (e.g. the shuttle "View Route" flow, or navigating to a building and then closing the modal without explicitly ending the route) where the route state is not fully reset. It's not clear in every case why the overlays persist, but the result is the same: leftover visual elements on the map that users cannot get rid of.

# Proposed Improvements

1. Audit all flows where navigation can end (user taps "End Route", closes a modal, switches tabs, etc.) and make sure the route state is fully reset in each case
   - Pay special attention to the shuttle route flow and any flows that transition between an indoor and outdoor route

2. Make sure any pop-ups or info cards that appear during navigation (e.g. route info, shuttle info, next class card) are dismissed when navigation ends, and not left floating on the screen

3. Add a manual fallback -- if overlays are still visible after ending navigation, provide a way for the user to dismiss them (e.g. a small X button on any floating card)

# Expected Outcome

- The map is clean after a route is ended, with no leftover polylines or pop-ups
- Users never see visual artifacts from a previous route while starting a new one
- Edge cases in the shuttle flow and other route transitions are covered

---

## Issue 6 [ALREADY DONE]

Issue: https://github.com/gabrielshufelt/soen390-commit-and-pray/issues/241

PR: https://github.com/gabrielshufelt/soen390-commit-and-pray/pull/259

**Title:** `[UT-IMP] Add Clear (×) Buttons to the Start and Destination Input Fields in the Search Bar`

**Label:** `usability-testing-improvements`

**Description:**

Currently, the search bar's start and destination input fields have no way to be cleared with a single tap. If a user has already set a value in one of the fields and wants to change it, they have to manually backspace through the text or re-type over it. There is no clear/reset button.

# Goal

Add an X (clear) button next to each input field so users can reset the start or destination in one tap.

# Problem

In `components/expandedSearchBar.tsx`, the input rows only contain a left-side icon and a text input -- there is no × button on the right side. The callbacks to clear the values (`onChangeDestination(null)`, `onChangeStart(null)`) already exist internally, but there is no UI element that triggers them.

2 out of 12 participants suggested adding this during testing, and Task 2 (searching for a destination) had 10 misclicks, some of which were likely caused by users struggling to re-enter or modify their inputs.

# Proposed Improvements

1. Add an × (clear) icon button to the right side of each input field
   - Should appear only when the field has a value (hide it when the field is empty)
   - Tapping it clears the field immediately

2. Make sure clearing one field does not accidentally clear the other

3. Optionally, show a "clear all" button somewhere accessible when both fields have values, for when the user wants to start over completely

# Expected Outcome

- Users can clear a start or destination in one tap
- No need to backspace or retype to change an input
- Reduces friction in the search-to-directions flow

---

## Issue 7

**Title:** `[UT-IMP] Improve Building Tap Targets and Add Visual Hints That Buildings Are Interactive`

**Label:** `usability-testing-improvements`

**Description:**

Some users during testing had difficulty tapping buildings on the map, especially smaller buildings. In addition, it was not immediately obvious to users that buildings on the map are tappable, since there is no visual affordance (glow, border, animation) that indicates interactivity.

# Goal

Increase the effective tap area for buildings on the map and add a subtle visual hint to indicate that buildings are interactive.

# Problem

Task 1 (finding Hall building on the map and tapping it) had 0% first click success across all 3 pilot test participants, and several participants in the full-scale test had misclicks or hesitation on building tapping. One participant specifically noted that "buildings are too small." Additionally:

- Building polygons only have a tap area equal to their exact polygon shape on the map. Small buildings (especially at zoom-out levels) can be very difficult to tap accurately.
- The building labels (letter codes shown when zoomed in) are not themselves tappable -- only the polygon beneath them is.
- There is no visual cue indicating that buildings are interactive elements (e.g. no highlight on hover, no border that suggests tappability).

# Proposed Improvements

1. Increase building tap targets
   - Consider adding a minimum hit area around small building polygons
   - Or expand the tappable area for buildings that are very small on screen

2. Make the building labels tappable, not just the polygon underneath
   - Currently the letter label (e.g. "H", "EV") displayed on the zoomed-in map is not tappable on its own -- only the underlying polygon is. Making the label itself tappable too would help with accuracy.

3. Add a visual affordance to indicate that buildings are interactive
   - Could be a subtle highlight or glow effect
   - Or a brief pulse/scale animation when the map finishes loading, to hint that buildings respond to taps
   - A simple approach: add a visible border/stroke to building polygons on the map

# Expected Outcome

- Users can tap buildings more reliably, especially smaller ones
- Users understand from the UI that buildings are tappable without needing to try randomly
- First click success rate on building selection tasks improves
