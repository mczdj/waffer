# Waffer release preparation (Android + Web)

This project is configured for an Android preview APK, a Google Play production AAB, and an Expo web export.

## Before building

1. Install Node.js LTS and Git on Windows.
2. Open this folder in VS Code / Command Prompt.
3. Run `npm install` (this installs the Expo web dependencies added for the browser build).
4. Keep `.env` local and set `EXPO_PUBLIC_OFFERS_API_URL=https://waffer-api-3rvu.onrender.com`. This public API URL is safe to bundle. Never put `SERPAPI_KEY` in the app or in an `EXPO_PUBLIC_` variable; it belongs only in the Render backend environment.
5. Sign in to Expo: `npx eas-cli login` (or install EAS CLI globally with `npm install -g eas-cli`, then `eas login`).

## Android test APK

`eas build --platform android --profile preview`

Download the APK from the EAS build page and install it on an Android device for final testing.

## Google Play AAB

`eas build --platform android --profile production`

The production profile generates an Android App Bundle (`.aab`) for Play Console. Upload it first to Internal testing, not directly to Production. Complete the Play Console app content declarations, Data safety, content rating, store listing, screenshots, privacy policy and app access details. Google Play may require a closed test before production access depending on the developer account type.

## Web export and deployment

Build the static browser bundle:

`npx expo export --platform web`

The generated site is in `dist/`. You can preview it locally with `npx expo serve`. To publish through Expo Hosting, run `npx eas-cli deploy` (or `eas deploy`) and follow the prompts; use `eas deploy --prod` for the production URL. You can also host the `dist/` folder on another static host.

## Important release checks

- The Android application ID and iOS bundle identifier are set to `com.waffer.uae`. Keep this identifier unchanged for all future builds after publishing.
- The nearby-store native map uses `react-native-maps`. A standalone Android release may need a Google Maps Platform Android API key configured in the native app config; Expo Go's built-in configuration does not guarantee the same map will work in a standalone build. Verify the map in the preview APK.
- Verify location permission messaging, all outbound store links, live deals, grocery basket, and backend availability on a physical device and in a browser before submitting.
- The app has not been submitted to Google Play or deployed to a public website by this preparation.

## Local commands

```cmd
cd /d C:\Users\ibrah\Downloads\waffer
npm install
npx expo start -c
```
