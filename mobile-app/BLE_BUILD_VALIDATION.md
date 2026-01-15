# BLE Native Module Build Validation Checklist

## ✅ Project Configuration Status

### 1. Project Type
- **Status**: ✅ Expo Managed Workflow
- **Evidence**: `app.json` present, no `android/` folder in repo
- **Action**: Must use `expo-dev-client` or production build (NOT Expo Go)

### 2. BLE Library Choice
- **Status**: ✅ Using `react-native-ble-manager` (v12.4.4)
- **Status**: ❌ **FIXED**: Removed duplicate `expo-bluetooth` (v0.0.0)
- **Action**: Only one BLE library should be installed

### 3. Expo Dev Client
- **Status**: ✅ `expo-dev-client` installed (v6.0.20)
- **Status**: ✅ Plugin configured in `app.json` plugins array
- **Action**: Must use dev client build, NOT Expo Go

### 4. Config Plugin
- **Status**: ✅ `react-native-ble-manager` plugin in `app.json` plugins array
- **Status**: ✅ Custom ProGuard plugin (`withProGuardRules.js`) configured
- **Action**: Plugins will auto-configure AndroidManifest and build files

### 5. Permissions (AndroidManifest)
- **Status**: ✅ All required permissions declared in `app.json`:
  - `android.permission.BLUETOOTH`
  - `android.permission.BLUETOOTH_ADMIN`
  - `android.permission.BLUETOOTH_SCAN` (Android 12+)
  - `android.permission.BLUETOOTH_CONNECT` (Android 12+)
  - `android.permission.ACCESS_FINE_LOCATION`
  - `android.permission.ACCESS_COARSE_LOCATION`

### 6. Runtime Permissions
- **Status**: ✅ Implemented in `src/utils/Permissions.ts`
- **Status**: ✅ Handles Android 12+ (API 31+) vs older versions
- **Status**: ✅ Requests BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION
- **Action**: Permissions are requested before BLE initialization

### 7. Import Pattern
- **Status**: ✅ **FIXED**: Changed from conditional import to top-level import
- **Before**: Conditional `require()` with try/catch (hides errors)
- **After**: Direct `import` + `NativeModules` validation check
- **Action**: Module availability is checked at load time, not hidden

### 8. NativeModules Validation
- **Status**: ✅ **ADDED**: `NativeModules.BleManager` check in BLEManager.ts
- **Action**: Logs clear error if module not in APK binary
- **Action**: Fails fast with actionable error message

### 9. Build Configuration
- **Status**: ✅ `expo-build-properties` configured:
  - `compileSdkVersion`: 35
  - `targetSdkVersion`: 34
  - `minSdkVersion`: 24
- **Status**: ✅ Compatible with `react-native-ble-manager` requirements

---

## 🚨 CRITICAL: Correct Build Path (Android)

### ❌ WRONG - Will Fail Forever
```bash
npx expo start
# Then opening in Expo Go
```
**Result**: Native modules won't load. Error: "BLE native module not available"

### ✅ CORRECT - Development Build
```bash
# 1. Clean previous builds (if any)
rm -rf android/.gradle android/app/build

# 2. Generate native folders
npx expo prebuild --clean

# 3. Build and install dev client
npx expo run:android

# 4. Start dev server (MUST use --dev-client flag)
npx expo start --dev-client
```

### ✅ CORRECT - Production Build
```bash
# 1. Clean
rm -rf android/.gradle android/app/build

# 2. Prebuild
npx expo prebuild --clean

# 3. Build APK
cd android && ./gradlew assembleRelease && cd ..
# OR use EAS Build
eas build --platform android --profile production
```

---

## 🔍 Validation Steps

### Step 1: Verify Not Using Expo Go
- [ ] App is NOT opened in Expo Go
- [ ] App is opened from dev client or installed APK
- [ ] Check: If you see "Expo Go" in app name/icon, you're using the wrong app

### Step 2: Verify Native Module in Binary
Add this check to your app startup (temporary debug):

```typescript
import { NativeModules } from 'react-native';

console.log('NativeModules keys:', Object.keys(NativeModules));
console.log('BleManager present:', !!NativeModules.BleManager);
```

**Expected**: `BleManager present: true`
**If false**: APK doesn't contain the module → rebuild required

### Step 3: Verify Build Artifacts
- [ ] Uninstall old app from device/emulator
- [ ] Delete `android/.gradle` folder
- [ ] Delete `android/app/build` folder
- [ ] Run `npx expo prebuild --clean`
- [ ] Run `npx expo run:android`
- [ ] Check `versionCode` in `android/app/build.gradle` changed

### Step 4: Verify Gradle Autolinking
After `prebuild`, check `android/settings.gradle`:
- Should include `react-native-ble-manager` in autolinking

Check `android/app/build.gradle`:
- Should have dependency: `implementation project(':react-native-ble-manager')`

### Step 5: Verify AndroidManifest
After `prebuild`, check `android/app/src/main/AndroidManifest.xml`:
- Should have BLE permissions declared
- Should have BLE service/activity if required by library

---

## 🐛 Troubleshooting

### Error: "BLE native module not available"

**Root Causes:**
1. ❌ Using Expo Go (most common)
2. ❌ Old APK installed (didn't rebuild)
3. ❌ Module not in NativeModules (build issue)
4. ❌ Gradle autolinking failed
5. ❌ Config plugin didn't run

**Fix Sequence:**
```bash
# 1. Uninstall app
adb uninstall com.scs.research.india.mobileapp

# 2. Clean everything
rm -rf android/.gradle android/app/build node_modules/.cache

# 3. Rebuild native folders
npx expo prebuild --clean

# 4. Verify plugin ran (check android/app/build.gradle for ble-manager)

# 5. Build and install
npx expo run:android

# 6. Start with dev client
npx expo start --dev-client
```

### Error: "NativeModules.BleManager is undefined"

**Meaning**: Module not compiled into APK

**Fix**:
1. Verify `react-native-ble-manager` in `package.json` dependencies
2. Run `npm install` (or `yarn install`)
3. Run `npx expo prebuild --clean`
4. Check `android/app/build.gradle` has the dependency
5. Rebuild: `npx expo run:android`

### Error: Permissions denied (but module loads)

**Meaning**: Runtime permissions not granted

**Fix**:
- Check `Permissions.ts` is called before BLE init
- Verify Android 12+ permissions (BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
- Check Settings → Apps → Your App → Permissions

---

## 📋 Pre-Build Checklist

Before every build, verify:

- [ ] Only ONE BLE library installed (`react-native-ble-manager`)
- [ ] `expo-dev-client` in dependencies and plugins
- [ ] `react-native-ble-manager` plugin in `app.json` plugins array
- [ ] All permissions in `app.json` android.permissions array
- [ ] `expo-build-properties` configured with correct SDK versions
- [ ] Top-level import (not conditional) in `BLEManager.ts`
- [ ] `NativeModules.BleManager` check implemented
- [ ] Old app uninstalled from device
- [ ] Build artifacts cleaned (`android/.gradle`, `android/app/build`)

---

## 🎯 Ownership Rule

**Build/Infra owns**: Getting `NativeModules.BleManager` to exist in the APK binary.

**Frontend owns**: BLE protocol logic AFTER module is confirmed present.

**Stop Condition**: If `NativeModules.BleManager` is `undefined`, STOP debugging JS. The problem is build/linking, not code.

---

## 📝 Quick Reference Commands

```bash
# Full clean rebuild (Android)
adb uninstall com.scs.research.india.mobileapp
rm -rf android/.gradle android/app/build
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client

# Verify module in binary (add to App.tsx temporarily)
import { NativeModules } from 'react-native';
console.log('BleManager:', NativeModules.BleManager ? '✅ Present' : '❌ Missing');
```

---

## ✅ Final Validation

After rebuild, the app should:
1. ✅ Load without "BLE native module not available" error
2. ✅ Show `NativeModules.BleManager` as defined (check logs)
3. ✅ Request BLE permissions on first launch
4. ✅ Initialize BLE Manager successfully
5. ✅ Scan for devices (if permissions granted)

If all ✅, BLE is properly configured. Proceed with protocol work.
