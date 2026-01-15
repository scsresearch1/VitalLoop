# Critical Foundation Checks - RUNTIME VERIFICATION

## ⚠️ NOTHING ELSE MATTERS UNTIL ALL ARE YES

These checks MUST be verified **at runtime** on the actual device after installing the APK.

**If ANY answer is NO → REJECT IMMEDIATELY**

**Do NOT proceed to:**
- Scanning
- GATT operations
- Data parsing
- Any other BLE functionality

---

## Required Runtime Checks

### 1. Is NativeModules.BleManager non-null at runtime?
**Answer**: Yes / No

**How to verify:**
- Launch app
- Check console/logs
- Look for: `✅ NativeModules.BleManager: PRESENT`
- Or manually check: `NativeModules.BleManager !== null && NativeModules.BleManager !== undefined`

**If NO:**
- APK doesn't contain native module
- Rebuild required
- Check build logs for errors

---

### 2. Is the APK installed built via expo run:android or eas build (not Expo Go)?
**Answer**: Yes / No

**How to verify:**
- Check app icon/name - should NOT say "Expo Go"
- Check build method used:
  - ✅ `npx expo run:android` (local build)
  - ✅ `eas build -p android` (cloud build)
  - ❌ `expo start` → Expo Go (WRONG)
  - ❌ `expo start --web` → Web (WRONG)

**If NO:**
- Wrong build method
- Rebuild using correct method

---

### 3. Does the app start WITHOUT showing "BLE native module not available"?
**Answer**: Yes / No

**How to verify:**
- Launch app
- Check for error message: "BLE native module not available"
- App should initialize without this error
- If error shown → NO

**If NO:**
- Native module not in APK
- Rebuild required

---

### 4. Can BleManager.start() execute without throwing?
**Answer**: Yes / No

**How to verify:**
- App should initialize BLE without crashing
- Check console for: `✅ BLE Manager initialized`
- No exceptions thrown during `BleManager.start()`

**If NO:**
- Native module present but not properly initialized
- Check permissions
- Check Bluetooth state
- Check build configuration

---

## Verification Script

Run this in your app console after launch:

```javascript
const { NativeModules } = require('react-native');
const BleManager = require('react-native-ble-manager').default;

const checks = {
  '1. NativeModules.BleManager non-null': 
    NativeModules.BleManager !== null && NativeModules.BleManager !== undefined,
  
  '2. Not Expo Go': 
    !NativeModules.ExponentConstants && require('react-native').Platform.OS === 'android',
  
  '3. No "BLE native module not available" error': 
    NativeModules.BleManager !== null, // If null, error would show
  
  '4. BleManager.start() can execute': 
    typeof BleManager !== 'undefined' && typeof BleManager.start === 'function'
};

console.log('=== CRITICAL FOUNDATION CHECKS ===');
let allPass = true;
Object.entries(checks).forEach(([check, result]) => {
  const status = result ? '✅ YES' : '❌ NO';
  console.log(`${status} - ${check}`);
  if (!result) allPass = false;
});

console.log('');
if (allPass) {
  console.log('✅ ALL CHECKS PASSED - Foundation verified!');
  console.log('→ Can proceed with BLE operations');
} else {
  console.log('❌ SOME CHECKS FAILED - REJECT IMMEDIATELY');
  console.log('→ Do NOT proceed with scanning, GATT, or data parsing');
  console.log('→ Fix build/configuration issues first');
}
console.log('===================================');
```

---

## Acceptance Criteria

**ALL must be YES:**

- [ ] ✅ NativeModules.BleManager non-null at runtime
- [ ] ✅ APK built via expo run:android or eas build (not Expo Go)
- [ ] ✅ App starts WITHOUT "BLE native module not available" error
- [ ] ✅ BleManager.start() executes without throwing

**If ALL YES → ACCEPT, proceed with BLE development**  
**If ANY NO → REJECT, fix build first**

---

## What Happens After Verification

### If ALL YES:
✅ Foundation is solid  
✅ Native module is present and working  
✅ Can proceed with:
- Device scanning
- GATT operations
- Data parsing
- Protocol implementation

### If ANY NO:
❌ Foundation is broken  
❌ Native module not available  
❌ STOP all BLE work  
❌ Fix build/configuration first

---

## Troubleshooting

### If Check 1 Fails (NativeModules.BleManager is null):
- Rebuild APK: `npx expo run:android` or `eas build`
- Verify plugin in `app.json`
- Check build logs for errors
- Uninstall old app, install new APK

### If Check 2 Fails (Wrong build method):
- Stop using Expo Go
- Use `npx expo run:android` for local build
- Use `eas build -p android` for cloud build

### If Check 3 Fails (Error shown):
- Native module not in APK
- Rebuild required
- Check build configuration

### If Check 4 Fails (BleManager.start() throws):
- Check permissions
- Check Bluetooth state
- Check native module initialization
- Review error logs

---

## Remember

**This is the absolute foundation. Nothing works without it.**

**Verify these 4 checks FIRST before any other work.**
