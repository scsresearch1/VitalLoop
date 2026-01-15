# Permission Issue Fix

## Current Issue

The app is showing: "Bluetooth permissions are required to connect to your ring. Please grant permissions in Settings."

## What I Added

1. **Retry Permissions Button** - Allows user to retry permission request without restarting app
2. **Open Settings Button** - Directly opens Android Settings to grant permissions
3. **Help Text** - Shows which permissions are needed

## How to Fix

### Option 1: Use the App Buttons (Easiest)

1. Tap **"Retry Permissions"** button
   - This will show the system permission dialogs again
   - Grant all permissions when prompted

2. If that doesn't work, tap **"Open Settings"** button
   - Navigate to: Apps → VitalLoop → Permissions
   - Enable:
     - **Bluetooth** (or **Nearby devices**)
     - **Location**

### Option 2: Manual Settings

1. Go to Android **Settings**
2. Tap **Apps** → **VitalLoop** (or your app name)
3. Tap **Permissions**
4. Enable:
   - **Bluetooth** / **Nearby devices**
   - **Location** (required for Bluetooth scanning on Android)

### Option 3: Grant During First Launch

The app should automatically show permission dialogs on first launch. If you dismissed them:
- Use "Retry Permissions" button
- Or go to Settings manually

## Required Permissions

### Android 12+ (API 31+):
- ✅ **BLUETOOTH_SCAN** - Required for scanning BLE devices
- ✅ **BLUETOOTH_CONNECT** - Required for connecting to devices
- ✅ **ACCESS_FINE_LOCATION** - Required for BLE scanning (Android requirement)

### Android 11 and below:
- ✅ **ACCESS_FINE_LOCATION** - Required for BLE scanning

## Verification

After granting permissions:
1. Tap "Retry Permissions" button
2. App should initialize successfully
3. You should see the device scan screen
4. No more permission errors

## If Still Having Issues

1. **Check Android version:**
   - Settings → About phone → Android version
   - Android 12+ needs different permissions than older versions

2. **Check if permissions are actually granted:**
   - Settings → Apps → VitalLoop → Permissions
   - All should show "Allowed"

3. **Try uninstalling and reinstalling:**
   - Sometimes permissions get stuck
   - Uninstall app completely
   - Reinstall from APK
   - Grant permissions on first launch

4. **Check console logs:**
   - Look for permission request logs
   - See which specific permission is failing
