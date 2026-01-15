# Build Checklist - Verify BEFORE Building

## ✅ CONFIRMED - These are correct:

1. ✅ **Permissions declared** in `app.json`:
   - BLUETOOTH, BLUETOOTH_ADMIN
   - BLUETOOTH_SCAN, BLUETOOTH_CONNECT (Android 12+)
   - ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
   - Added `usesPermissionFlags` for BLUETOOTH_SCAN with `neverForLocation: true`

2. ✅ **Runtime permission requests** implemented:
   - `Permissions.ts` handles Android 12+ permission requests
   - Called before BLE initialization

3. ✅ **Native modules**:
   - `expo-dev-client` plugin in `app.json` (ensures native modules are linked)
   - `react-native-ble-manager` installed
   - `react-native-permissions` installed
   - `react-native-reanimated` installed
   - `react-native-worklets` installed

4. ✅ **Build configuration**:
   - `developmentClient: false` in production/preview (standalone app)
   - `developmentClient: true` only in development profile
   - SDK versions: minSdk 24, targetSdk 34, compileSdk 35

5. ✅ **Babel config**:
   - `react-native-reanimated/plugin` included
   - `babel-preset-expo` configured

## ⚠️ POTENTIAL ISSUES - Need verification:

1. **CRITICAL**: `expo-dev-client` plugin ensures native modules are included, but verify:
   - Without `developmentClient: true`, native modules SHOULD still be included via the plugin
   - However, some native modules might require explicit config plugins

2. **MISSING**: Config plugin for `react-native-ble-manager`:
   - `react-native-ble-manager` might need a config plugin to properly configure AndroidManifest
   - Check if `@matthewwarnes/react-native-ble-manager-plugin` or similar is needed

3. **MISSING**: Config plugin for `react-native-permissions`:
   - `react-native-permissions` might need explicit config plugin setup
   - Verify if it auto-links or needs manual config

4. **VERIFY**: `usesPermissionFlags` format:
   - Added `usesPermissionFlags` but need to verify this is the correct Expo format
   - Might need to use config plugin/mod instead

5. **MISSING**: AndroidManifest `<uses-feature>`:
   - Should declare `android.hardware.bluetooth_le` as required
   - Might need config plugin to add this

## 🔍 What to verify in the build:

1. Check build logs for:
   - Native modules being linked
   - No "module not found" errors
   - Permissions being added to AndroidManifest

2. After build, verify:
   - APK installs successfully
   - App launches (not dev client screen)
   - Permission dialogs appear on first launch
   - BLE scanning works

## 📋 Pre-build verification commands:

```bash
# Check if prebuild generates correct native code
cd mobile-app
npx expo prebuild --clean --no-install

# Verify AndroidManifest has permissions
# Check android/app/src/main/AndroidManifest.xml after prebuild
```
