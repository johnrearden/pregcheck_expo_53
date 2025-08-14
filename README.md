### EAS Ops

#### Android preview apk (internal distribution)

```eas build --platform android --profile preview```

#### Android ejected development build

```eas build -p android --profile development```

```npx expo start --dev-client -c```

#### Ios ejected development build

```eas build --platform ios --profile development-ios```

This requires a "

#### Android production aab (Play Store Internal Testing Track)
```eas build --platform android --profile production```

#### Ios production .ipa (App Store TestFlight)
```eas build -p ios --profile production-ios```

- and to submit to AppStoreConnect : 
    - ```eas submit --platform ios```


#### Google Admob test ids
- Banner
    - ca-app-pub-3940256099942544/6300978111

- Interstitial
    - ca-app-pub-3940256099942544/1033173712

#### react-native-google-mobile-ads build breaker

Use 14.7.2 [stackoverflow](https://stackoverflow.com/questions/77433573/react-native-google-ads-kotlin-compile-error/79558626#79558626)

### Android USB debugging

# 1 Plug the phone in, confirm “USB debugging”
adb devices         # should list your device as "device", not "unauthorized"

# 2 Clear old noise
adb logcat -c

# 3 Start the app on the phone, then in another terminal run:
adb logcat  |  grep --line-buffered -E "pregcheck|AndroidRuntime|CRASH"

### Build release variant for android emulator to run e2e tests:

npx expo run:android --variant release


# Production Deployment Checklist

- [ ] Connected to pregcheck.ai for API requests
- [ ] Unposted record check interval > 1 minute
- [ ] Live ads
- [ ] Live emails
- [ ] USE_SERVER_POSTGRES = True


### Store keywords

pregcheck, livestock management, herd management, farm management, pregnancy scan, veterinary scan, cow pregnancy, sheep pregnancy, goat pregnancy, scan results, animal husbandry, calf weight tracking, herd health, vet reporting, scan summary, PDF report, CSV export, email report, dairy farm, small ruminants, cattle herd, sheep flock, goat herd, pregnancy tracking, farm data, offline livestock records, vet record keeping



