# Rebuild Instructions - Native Android APK

## ⚠️ CRITICAL: Do NOT use Expo Go

The app requires native modules (`react-native-ble-manager`) which are **NOT available in Expo Go**.

You **MUST** build a native Android APK using one of these methods:

---

## Option 1: Development Build (Recommended for Testing)

### Prerequisites
- Android device connected via USB (with USB debugging enabled)
- OR Android emulator running
- Node.js and npm installed
- Expo CLI installed: `npm install -g expo-cli`

### Steps

1. **Navigate to mobile-app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Uninstall old app from device/emulator:**
   ```bash
   adb uninstall com.scs.research.india.mobileapp
   ```

4. **Clean previous build artifacts:**
   ```bash
   # Remove Gradle cache and build folders
   rm -rf android/.gradle android/app/build
   ```

5. **Generate native Android folders (if needed):**
   ```bash
   npx expo prebuild --clean
   ```

6. **Build and install dev client:**
   ```bash
   npx expo run:android
   ```

   This will:
   - Build the native Android APK with all native modules
   - Install it on your connected device/emulator
   - Start the Metro bundler

7. **Verify NativeModules.BleManager is PRESENT:**
   - Check console/logs for: `✅ NativeModules.BleManager: PRESENT`
   - If you see `❌ MISSING`, the build failed - check build logs

---

## Option 2: Production Build with EAS (Recommended for Release)

### Prerequisites
- EAS CLI installed: `npm install -g eas-cli`
- EAS account (free tier available)
- `eas.json` configured (already in project)

### Steps

1. **Navigate to mobile-app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to EAS (if not already):**
   ```bash
   eas login
   ```

4. **Build Android APK:**
   ```bash
   eas build --platform android --profile production
   ```

   Or for development build:
   ```bash
   eas build --platform android --profile development
   ```

5. **Download and install APK:**
   - EAS will provide a download link
   - Download the APK
   - Install on device: `adb install path/to/app.apk`
   - Or scan QR code with device

6. **Verify NativeModules.BleManager is PRESENT:**
   - Launch app
   - Check console/logs for: `✅ NativeModules.BleManager: PRESENT`

---

## Verification Checklist

After building and installing, verify:

- [ ] App is **NOT** Expo Go (check app icon/name)
- [ ] Console shows: `✅ NativeModules.BleManager: PRESENT`
- [ ] App initializes without "BLE native module not available" error
- [ ] Bluetooth state checking works
- [ ] Scan/connect operations work

---

## Troubleshooting

### If NativeModules.BleManager is MISSING:

1. **Verify you're not using Expo Go:**
   - Check app icon - should NOT say "Expo Go"
   - If it does, rebuild using instructions above

2. **Check build logs:**
   ```bash
   npx expo run:android --verbose
   ```
   Look for errors about `react-native-ble-manager`

3. **Verify plugin ran:**
   - Check `android/app/build.gradle` contains:
     ```gradle
     implementation project(':react-native-ble-manager')
     ```

4. **Clean and rebuild:**
   ```bash
   rm -rf android/.gradle android/app/build node_modules/.cache
   npx expo prebuild --clean
   npx expo run:android
   ```

5. **Check app.json plugins:**
   - Verify `react-native-ble-manager` is in plugins array
   - Verify `expo-dev-client` is in plugins array

---

## Quick Commands Reference

```bash
# Development build (local)
cd mobile-app
npm install
adb uninstall com.scs.research.india.mobileapp
rm -rf android/.gradle android/app/build
npx expo prebuild --clean
npx expo run:android

# Production build (EAS)
cd mobile-app
npm install
eas build --platform android --profile production

# Start dev server (after build)
npx expo start --dev-client
```

---

## Important Notes

- **DO NOT** use `npx expo start` without `--dev-client` flag
- **DO NOT** open app in Expo Go
- **DO** uninstall old app before installing new build
- **DO** check logs for `NativeModules.BleManager: PRESENT` confirmation

---

## Next Steps After Build

1. Verify NativeModules.BleManager is PRESENT in logs
2. Test Bluetooth state checking (turn Bluetooth off/on)
3. Test device scanning and connection
4. Test auto-reconnect on unexpected disconnect
5. Test manual reconnect without rescanning

See `NATIVE_MODULE_VALIDATION.md` for detailed validation steps.
