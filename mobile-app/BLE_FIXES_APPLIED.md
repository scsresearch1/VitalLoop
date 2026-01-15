# BLE Native Module Fixes Applied

## ✅ Critical Fixes Completed

### 1. Removed Duplicate BLE Library
- **Removed**: `expo-bluetooth` (v0.0.0) from `package.json`
- **Reason**: Only one BLE library should be installed. Using `react-native-ble-manager` exclusively.
- **Action Required**: Run `npm install` to update dependencies

### 2. Fixed Conditional Import Pattern
- **Before**: Conditional `require()` with try/catch (hides errors until runtime)
- **After**: Top-level `import BleManager from 'react-native-ble-manager'`
- **Reason**: Conditional imports mask build issues. Top-level import fails fast if module not available.

### 3. Added NativeModules Validation
- **Added**: `NativeModules.BleManager` check at module load time
- **Behavior**: Logs clear error if module not in APK binary
- **Error Message**: Provides actionable steps (uninstall, prebuild, rebuild)

### 4. Fixed BleManager Usage Pattern
- **Before**: Attempted to instantiate with `new BleManager()` (incorrect - it's a singleton)
- **After**: Use `BleManager` directly as singleton instance
- **Reason**: `react-native-ble-manager` exports a singleton, not a class

### 5. Updated Package Scripts
- **Changed**: `npm start` now defaults to `expo start --dev-client`
- **Added**: `npm run start:expo-go` for Expo Go (if needed for non-BLE testing)
- **Added**: `npm run android:clean` for clean rebuilds
- **Added**: `npm run prebuild` shortcut

---

## 📋 Next Steps (REQUIRED)

### Step 1: Install Updated Dependencies
```bash
cd mobile-app
npm install
```

### Step 2: Uninstall Old App
```bash
# If app is installed on device/emulator
adb uninstall com.scs.research.india.mobileapp
```

### Step 3: Clean Build Artifacts
```bash
# Remove old build artifacts
rm -rf android/.gradle android/app/build
```

### Step 4: Rebuild Native Folders
```bash
npx expo prebuild --clean
```

### Step 5: Build and Install Dev Client
```bash
npx expo run:android
```

### Step 6: Start Dev Server (WITH dev-client flag)
```bash
npx expo start --dev-client
```

**CRITICAL**: Do NOT use `npx expo start` without `--dev-client` flag. Do NOT open in Expo Go.

---

## 🔍 Validation After Rebuild

### Check 1: Native Module Present
Add this temporary check to `App.tsx` (remove after validation):

```typescript
import { NativeModules } from 'react-native';

console.log('NativeModules keys:', Object.keys(NativeModules));
console.log('BleManager present:', !!NativeModules.BleManager);
```

**Expected Output**:
```
NativeModules keys: [... 'BleManager' ...]
BleManager present: true
```

**If `false`**: APK doesn't contain module → rebuild required

### Check 2: App Initializes Without Error
- App should load without "BLE native module not available" error
- Check console logs for: `✅ BLE Manager initialized - native module verified`

### Check 3: Permissions Request
- On first launch, app should request BLE permissions
- Grant permissions and verify BLE initializes

---

## 🚨 Common Issues & Solutions

### Issue: "BLE native module not available" after rebuild
**Possible Causes**:
1. Still using Expo Go → Use dev client
2. Old APK installed → Uninstall and rebuild
3. Module not in NativeModules → Check build logs, verify plugin ran

**Solution**:
```bash
# Full clean rebuild
adb uninstall com.scs.research.india.mobileapp
rm -rf android/.gradle android/app/build node_modules/.cache
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

### Issue: "NativeModules.BleManager is undefined"
**Meaning**: Module not compiled into APK

**Solution**:
1. Verify `react-native-ble-manager` in `package.json`
2. Run `npm install`
3. Check `android/app/build.gradle` has dependency
4. Rebuild: `npx expo run:android`

### Issue: Build fails with Gradle errors
**Solution**:
1. Check `android/build.gradle` and `android/app/build.gradle`
2. Verify SDK versions match `app.json` config
3. Check Kotlin version compatibility
4. Try: `cd android && ./gradlew clean && cd ..`

---

## 📝 Files Modified

1. `mobile-app/package.json`
   - Removed `expo-bluetooth` dependency
   - Updated scripts to enforce dev-client usage

2. `mobile-app/src/services/BLEManager.ts`
   - Changed to top-level import
   - Added NativeModules validation
   - Fixed singleton usage pattern
   - Removed all `this.bleManager` references

3. `mobile-app/BLE_BUILD_VALIDATION.md` (NEW)
   - Comprehensive validation checklist
   - Build path instructions
   - Troubleshooting guide

---

## ✅ Success Criteria

After following the steps above, you should have:

- ✅ No "BLE native module not available" error
- ✅ `NativeModules.BleManager` is defined
- ✅ BLE Manager initializes successfully
- ✅ Permissions are requested and granted
- ✅ App can scan for BLE devices

If all criteria met, BLE is properly configured. Proceed with protocol work.

---

## 🎯 Ownership

**Build/Infra**: Getting `NativeModules.BleManager` to exist in APK
**Frontend**: BLE protocol logic (AFTER module confirmed present)

**Stop Condition**: If `NativeModules.BleManager` is `undefined`, STOP debugging JS. Problem is build/linking.
