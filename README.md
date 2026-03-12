# SOEN390 - Commit and Pray
# Campus Navigation Mobile Application for Concordia University

## INTRODUCTION
Navigating Concordia’s campuses, especially indoor spaces, can be challenging
for students, staff, and visitors, particularly those with accessibility needs.

This project aims to provide a unified mobile solution for outdoor and indoor
campus navigation, offering accessibility-aware routing, classroom directions,
and points of interest across both SGW and Loyola campuses.

## TARGET USERS
- Concordia students navigating between classes
- Faculty and staff moving across campus buildings
- Visitors unfamiliar with Concordia campuses
- Users with accessibility needs requiring step-free routes

## CORE FEATURES
- Interactive campus maps for SGW and Loyola
- Outdoor directions using Google Maps API
- Indoor navigation with accessibility-aware routing
- Building and room search
- Points of interest discovery (washrooms, elevators, food)

## DEPENDENCIES
The following tools and dependencies are required to run this project:

- Node.js 20+ (with npm)
- Python 3.14+ (with pip)
- FastAPI
- Expo Go installed on a physical mobile device (iOS or Android)

## FASTAPI INSTALLATION (UNIX)
If FastAPI is not installed, you can set it up on Unix-based systems with:
```
sudo apt install -y python3 python3-venv python3-pip
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install "fastapi[standard]"
cd ..
```
  
## INSTALLATION
1. Clone the repository:
   `git clone https://github.com/gabrielshufelt/soen390-commit-and-pray.git`

2. Navigate into the project directory:
   `cd soen390-commit-and-pray`

3. Install frontend (mobile app) dependencies:
   ```
   cd mobile
   npm install
   npm install expo
   cd ..
   ```

4. Install backend dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   cd ..
   ```
   
## RUNNING THE APPLICATION
### FRONTEND (MOBILE APP)

#### First Time Setup

Before starting, make sure to install the project dependencies:

```bash
cd mobile
npm install
```

You **must run one of these commands first** to build the development version with native modules.

**Android:**
```bash
cd mobile
npx expo run:android
```

After the build is done, add this line into AndroidManifest.xml which is found in (`mobile/android/app/src/AndroidManifest.xml`)
`<meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyA0fCunDGs5GsP4QY9t5zmoWe_S437VFAk"/>`
Inside the `<application>` tag
You're file should look like this:
```<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="https"/>
    </intent>
  </queries>
  <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true" android:enableOnBackInvokedCallback="false">
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>
    <meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyA0fCunDGs5GsP4QY9t5zmoWe_S437VFAk"/> <!--  add this line -->
    <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true" android:screenOrientation="portrait">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="mobile"/>
      </intent-filter>
    </activity>
  </application>
</manifest>
```

If you have not set up an Android Emulator, follow this guide:  
https://docs.expo.dev/workflow/android-studio-emulator/

**iOS:**
```bash
cd mobile
npx expo run:ios
```

These commands will:
1. Build a development version of the app with all native modules
2. Install it on your device or simulator
3. Start the Metro bundler

---

#### Subsequent Runs

After the initial build, you can use the standard development workflow:

```bash
cd mobile
npx expo start
```

Then press:

- `s` to switch to development build  
- `a` to open on Android (development build)  
- `i` to open on iOS (development build)

The development build will reconnect to the Metro bundler without needing to rebuild the native code (unless native dependencies change).

### BACKEND
5. Navigate to the backend directory:
   `cd backend`

6. Start the FastAPI backend server:
   `fastapi dev main.py`

The backend server will start locally on the configured port.

## DOCUMENTATION & PROCESS
All detailed documentation for this project can be found in the GitHub Wiki which includes: 
- Domain Model
- Component Diagram
- User Personas
- Accessibility Considerations
- UI Mockups
- Sprint planning and retrospectives

## Code Quality Review
The SonarQube Portal containing our project and all the analytics can be found here: [SonarQube](https://sonarcloud.io/project/overview?id=soen390-commit-and-pray_commit-and-pray)
