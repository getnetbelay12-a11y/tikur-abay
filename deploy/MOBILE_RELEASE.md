# Tikur Abay Mobile Release Runbook

## Environment Config Files

The Flutter app uses `--dart-define-from-file` for environment-specific builds.

Files:
- local: [`apps/driver/config/local.json`](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config/local.json)
- stage template: [`apps/driver/config/stage.example.json`](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config/stage.example.json)
- production template: [`apps/driver/config/production.example.json`](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config/production.example.json)

Create real stage and production files before release:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config
cp stage.example.json stage.json
cp production.example.json production.json
```

Do not commit private production endpoints if they differ from the public examples.

Validate config files before building:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm mobile:config:validate:local
pnpm mobile:config:validate:stage
pnpm mobile:config:validate:prod
```

Run the mobile verification bundle before release:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm mobile:verify
```

This runs:
- local mobile config validation
- `flutter analyze`
- `flutter test`
- and prints a compact pass/fail summary

All mobile helper scripts now also fail early if:
- `node` or `flutter` is missing
- the required config file does not exist
- `xcodebuild` is missing for iOS release commands

## Local Run

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm mobile:run:local
```

## iOS Release Builds

Stage:

```bash
pnpm mobile:build:ios:stage
```

Production:

```bash
pnpm mobile:build:ios:prod
```

## Android Release Builds

APK stage:

```bash
pnpm mobile:build:apk:stage
```

APK production:

```bash
pnpm mobile:build:apk:prod
```

App Bundle stage:

```bash
pnpm mobile:build:appbundle:stage
```

App Bundle production:

```bash
pnpm mobile:build:appbundle:prod
```

## Signing Notes

- iOS signing is managed in Xcode with the correct Apple team and provisioning profile.
- Android signing should use a release keystore configured in the Flutter Android project before shipping.
- Non-production builds show an environment badge in the app header and login screen.
- Production builds should not show the environment badge.

### Android signing

Create a real Android signing file from:

```bash
cp /Users/getnetbelay/Documents/Tikur_Abay/apps/driver/android/key.properties.example \
   /Users/getnetbelay/Documents/Tikur_Abay/apps/driver/android/key.properties
```

Then set:
- `storePassword`
- `keyPassword`
- `keyAlias`
- `storeFile`

If `android/key.properties` is missing, release builds fall back to the debug key so local validation still works, but that must not be used for a real release.

### iOS export options

Templates:
- [ExportOptions.stage.plist.example](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/ios/ExportOptions.stage.plist.example)
- [ExportOptions.production.plist.example](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/ios/ExportOptions.production.plist.example)

Create real copies and replace the Apple team id before archive export.

### Native app identity

The mobile app now uses:
- Android application id: `com.tikurabay.transport.driver`
- iOS bundle id: `com.tikurabay.transport.driver`

## Release Checklist

1. Confirm backend/API target is correct in `stage.json` or `production.json`.
2. Run:
   ```bash
   flutter analyze
   flutter test
   ```
3. Build the correct artifact.
4. Install and smoke-test login, trip view, chat, alerts, and document upload.
5. Verify the app points to the intended API environment.
