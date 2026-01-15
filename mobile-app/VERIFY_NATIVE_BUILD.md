# Native Android Build Verification - CRITICAL

## ⚠️ NOTHING ELSE MATTERS UNTIL THIS IS TRUE

All of the following must be **TRUE simultaneously**:

---

## ✅ Verification Checklist

### 1. App is NOT running in:
- [ ] ❌ **Expo Go** - Check app icon/name, should NOT say "Expo Go"
- [ ] ❌ **Web build** - Check Platform.OS, should be 'android', not 'web'
- [ ] ❌ **Debug JS-only environment** - Must be native build with native modules

### 2. APK is built via:
- [ ] ✅ `npx expo run:android` (development build)
- [ ] OR ✅ `eas build -p android` (production build)

### 3. Installed APK includes:
- [ ] ✅ `react-native-ble-manager` native Android code compiled into APK
- [ ] ✅ Native module linked in `android/app/build.gradle`
- [ ] ✅ Native module present in `android/settings.gradle`

### 4. At runtime:
- [ ] ✅ `NativeModules.BleManager !== null`
- [ ] ✅ `NativeModules.BleManager !== undefined`
- [ ] ✅ Console shows: `✅ NativeModules.BleManager: PRESENT`

---

## 🚨 If ANY condition is FALSE → STOP

**Do NOT proceed with:**
- BLE protocol work
- UI improvements
- Feature development
- Testing other functionality

**ONLY proceed when ALL conditions are TRUE.**

---

## How to Verify

### Step 1: Check Build Method

**Verify you built with native tools:**
```bash
# Check if you ran:
npx expo run:android
# OR
eas build -p android
```

**If you used:**
- `npx expo start` → ❌ WRONG (Expo Go)
- `expo start --web` → ❌ WRONG (Web build)
- Any other method → ❌ WRONG

### Step 2: Check APK Contents

**Verify native module is in APK:**
```bash
# Check build.gradle includes the module
grep "react-native-ble-manager" android/app/build.gradle

# Should show:
# implementation project(':react-native-ble-manager')
```

**If not present:** Native module not linked → Rebuild required

### Step 3: Check Runtime

**Launch app and check console:**
```
✅ NativeModules.BleManager: PRESENT
✅ Native module is loaded at runtime
✅ App is running as native Android build (not Expo Go)
```

**If you see:**
```
❌ NativeModules.BleManager: MISSING
```

**Then:** APK doesn't contain native module → Rebuild required

### Step 4: Manual Runtime Check

**Add this to App.tsx temporarily:**
```typescript
import { NativeModules } from 'react-native';

console.log('=== NATIVE MODULE VERIFICATION ===');
console.log('NativeModules.BleManager:', NativeModules.BleManager);
console.log('Is null?', NativeModules.BleManager === null);
console.log('Is undefined?', NativeModules.BleManager === undefined);
console.log('Is present?', NativeModules.BleManager !== null && NativeModules.BleManager !== undefined);
console.log('All NativeModules:', Object.keys(NativeModules));
console.log('===================================');
```

**Expected output:**
```
=== NATIVE MODULE VERIFICATION ===
NativeModules.BleManager: [object Object]
Is null? false
Is undefined? false
Is present? true
All NativeModules: [... 'BleManager' ...]
===================================
```

---

## Build Verification Commands

### Verify Build Configuration

```bash
cd mobile-app

# Check if native folders exist
ls android/

# Check if module is in build.gradle
grep -r "react-native-ble-manager" android/app/build.gradle

# Check if module is in settings.gradle
grep -r "react-native-ble-manager" android/settings.gradle

# Check if plugin ran
grep -r "react-native-ble-manager" app.json
```

### Verify APK Contains Native Code

```bash
# After build, check APK
cd android/app/build/outputs/apk

# List APK contents (if you have aapt or unzip)
unzip -l app-debug.apk | grep -i "ble\|native"

# Or check APK size (native builds are larger)
ls -lh *.apk
```

---

## Rebuild Instructions (If Verification Fails)

### If NativeModules.BleManager is MISSING:

1. **Uninstall old app:**
   ```bash
   adb uninstall com.scs.research.india.mobileapp
   ```

2. **Clean everything:**
   ```bash
   cd mobile-app
   rm -rf android/.gradle android/app/build node_modules/.cache
   ```

3. **Rebuild native folders:**
   ```bash
   npx expo prebuild --clean
   ```

4. **Verify plugin ran:**
   ```bash
   # Check build.gradle has the module
   grep "react-native-ble-manager" android/app/build.gradle
   ```

5. **Build and install:**
   ```bash
   npx expo run:android
   ```

6. **Verify at runtime:**
   - Check console for: `✅ NativeModules.BleManager: PRESENT`
   - If still MISSING → Build configuration issue

---

## Acceptance Criteria

**You can ONLY proceed when:**

✅ App is native Android build (not Expo Go, not web)  
✅ Built via `npx expo run:android` or `eas build`  
✅ APK contains `react-native-ble-manager` native code  
✅ `NativeModules.BleManager !== null` at runtime  
✅ Console shows: `✅ NativeModules.BleManager: PRESENT`

**If ALL are TRUE → Proceed with BLE development**  
**If ANY is FALSE → STOP and fix build first**

---

## Quick Test Script

Run this in your app console:
```javascript
const { NativeModules } = require('react-native');

const checks = {
  'Not Expo Go': !NativeModules.ExponentConstants,
  'Not Web': require('react-native').Platform.OS === 'android',
  'BleManager Present': NativeModules.BleManager !== null && NativeModules.BleManager !== undefined,
  'BleManager Not Null': NativeModules.BleManager !== null,
  'BleManager Not Undefined': NativeModules.BleManager !== undefined,
};

console.log('=== NATIVE BUILD VERIFICATION ===');
Object.entries(checks).forEach(([check, result]) => {
  console.log(`${result ? '✅' : '❌'} ${check}: ${result}`);
});
console.log('===================================');

const allPass = Object.values(checks).every(v => v === true);
if (allPass) {
  console.log('✅ ALL CHECKS PASSED - Native build verified!');
} else {
  console.log('❌ SOME CHECKS FAILED - Rebuild required!');
}
```

---

## Remember

**This is the foundation. Nothing else works without it.**
