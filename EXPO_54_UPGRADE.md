# Expo SDK 53 → 54 upgrade (Android API 36)

**Why:** Google Play requires app updates to target Android 16 (API 36). SDK 54 (React Native 0.81) is the
first Expo SDK that targets API 36 by default. It is also the **last SDK that supports the Legacy
Architecture**, and this app still runs `newArchEnabled: false`. SDK 55+ requires the New Architecture,
which is a separate migration.

## What changed
- `expo` 53 → 54, with all Expo and React Native packages aligned via `npx expo install --check`:
  react 19.1.0, react-native 0.81.5, expo-router 6, expo-sqlite 16, expo-notifications 0.32.
- `react-native-reanimated` is pinned to **~3.19.5**, because v4 needs the New Architecture. It is listed in
  `package.json` → `expo.install.exclude` so that `expo install --check` and `expo-doctor` don't flag it.
- `babel-preset-expo` and `expo-asset` were added as direct dependencies. Without them npm nests both under
  `node_modules/expo/`, and then Babel/Jest can't resolve the preset and `expo-font`/`expo-sqlite` can't
  resolve `expo-asset`.
- `android/` and `ios/` were regenerated with `npx expo prebuild --clean`. compileSdk and targetSdk now
  resolve to 36 from the React Native 0.81 defaults; Gradle is 8.14.3.
- `package-lock.json` was regenerated from scratch.

## Behaviour changes on Android to check (previously not shipped)
The committed native folders had drifted from `app.json`. They were last regenerated in Oct 2025, before
the heat notification feature was added in Jan 2026. Regenerating them means these changes ship for the
first time:
- The **`SCHEDULE_EXACT_ALARM`** permission in the Android manifest. Google Play may ask for an exact-alarm
  declaration in the Play Console.
- The expo-notifications **notification icon and colour** from `app.json`: `icon.png`, `#ffffff`. Android
  draws notification icons as a monochrome silhouette.
- On iOS: the **`aps-environment`** entitlement, which expo-notifications adds, and `CFBundleShortVersionString`
  / `CFBundleVersion`, which now sync from `app.json` (1.2.33 / 12).

## Android 16 (targetSdk 36) platform behaviour
- Edge-to-edge is mandatory. It was already enabled (`edgeToEdgeEnabled: true`).
- On large screens (≥ 600dp: tablets, foldables) Android 16 ignores `screenOrientation="portrait"` and
  makes the app resizable. Check the layouts on a tablet.
