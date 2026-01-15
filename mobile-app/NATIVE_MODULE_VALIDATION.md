# Native Module Runtime Validation

## How to Verify NativeModules.BleManager is Present

### At App Startup

When the app launches, check the console/logs for:

**✅ SUCCESS - Module Present:**
```
✅ NativeModules.BleManager: PRESENT
✅ Native module is loaded at runtime
✅ App is running as native Android build (not Expo Go)
```

**❌ FAILURE - Module Missing:**
```
❌ NativeModules.BleManager: MISSING
❌ Native module NOT found in NativeModules
```

### In App.tsx Initialization

The app also logs during initialization:
```
=== BLE NATIVE MODULE VALIDATION ===
NativeModules.BleManager: ✅ PRESENT (or ❌ MISSING)
All NativeModules keys: [list of BLE-related modules]
===================================
```

### Manual Check in Code

You can also add this temporary check anywhere in your app:

```typescript
import { NativeModules } from 'react-native';

console.log('NativeModules.BleManager:', NativeModules.BleManager ? '✅ PRESENT' : '❌ MISSING');
console.log('All NativeModules:', Object.keys(NativeModules));
```

---

## What This Means

### ✅ PRESENT = Correct Build
- App is installed from a **native Android APK** (dev client or production build)
- **NOT** using Expo Go
- Native module is properly linked and compiled into the APK
- BLE functionality should work

### ❌ MISSING = Wrong Build
- App is likely using **Expo Go** (which doesn't support native modules)
- OR native module wasn't included in the build
- OR build configuration issue
- **BLE will NOT work** - you'll see "BLE native module not available" error

---

## Build Requirements

To get NativeModules.BleManager to be PRESENT:

1. **Must use dev client or production build:**
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   # OR
   eas build --platform android
   ```

2. **Must NOT use Expo Go:**
   ```bash
   # WRONG - This won't have native modules
   npx expo start
   # Then opening in Expo Go
   ```

3. **Verify build:**
   - Check `android/app/build.gradle` has `react-native-ble-manager` dependency
   - Check `android/settings.gradle` includes the module
   - Verify APK was built with native code (not just JS bundle)

---

## Troubleshooting

### If Module is MISSING:

1. **Check if using Expo Go:**
   - Look at app icon/name - does it say "Expo Go"?
   - If yes, rebuild as dev client or production APK

2. **Check build configuration:**
   ```bash
   # Clean and rebuild
   rm -rf android/.gradle android/app/build
   npx expo prebuild --clean
   npx expo run:android
   ```

3. **Verify plugin ran:**
   - Check `android/app/build.gradle` for `react-native-ble-manager`
   - Check `app.json` has `react-native-ble-manager` in plugins array

4. **Check APK:**
   - Uninstall old app
   - Install newly built APK
   - Check logs on fresh install

---

## Acceptance Criteria

**For BLE to work, you MUST see:**
- ✅ `NativeModules.BleManager: PRESENT` in logs
- ✅ App is NOT Expo Go
- ✅ App is installed from native APK (dev client or production)

**If you see:**
- ❌ `NativeModules.BleManager: MISSING`
- ❌ App is Expo Go
- ❌ "BLE native module not available" error

**Then:** Stop debugging JS code. The problem is build/linking. Rebuild the APK.

---

## Quick Test

Run this in your app console:
```javascript
const { NativeModules } = require('react-native');
console.log('BleManager present:', !!NativeModules.BleManager);
console.log('Is Expo Go:', !!NativeModules.ExponentConstants);
```

**Expected:**
- `BleManager present: true`
- `Is Expo Go: false`

**If different:** Wrong build type, rebuild required.
