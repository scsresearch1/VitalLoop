/**
 * BLE Permissions Handler
 * Uses PermissionsAndroid directly (recommended for Android 12+)
 * Based on official Android documentation and react-native-ble-manager best practices
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Request all required BLE permissions for Android
 * Returns true if all permissions are granted, false otherwise
 */
export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS handled separately
  }

  const androidVersion = Platform.Version as number;

  try {
    // Android 12+ (API 31+) - requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    if (androidVersion >= 31) {
      console.log('📱 Android 12+ detected - requesting new Bluetooth permissions');

      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      // Request all permissions at once
      const granted = await PermissionsAndroid.requestMultiple(permissions);

      console.log('📱 Permission results:', JSON.stringify(granted, null, 2));

      // Check if all required permissions are granted
      const scanGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;

      if (!scanGranted || !connectGranted) {
        console.error('❌ Permissions denied:', {
          scan: scanGranted ? 'GRANTED' : granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN],
          connect: connectGranted ? 'GRANTED' : granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT],
        });

        // Check if permissions are blocked (user selected "Don't ask again")
        const scanBlocked = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        const connectBlocked = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (scanBlocked || connectBlocked) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth permissions are required to connect to your ring. Please enable them in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
        } else {
          Alert.alert(
            'Permissions Required',
            'Bluetooth permissions are required to scan and connect to your ring.',
            [{ text: 'OK' }]
          );
        }

        return false;
      }

      console.log('✅ All Bluetooth permissions granted');
      return true;
    }
    // Android 6-11 (API 23-30) - only need location permission
    else if (androidVersion >= 23) {
      console.log('📱 Android 6-11 detected - requesting location permission');

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Location permission granted');
        return true;
      } else {
        console.error('❌ Location permission denied:', granted);

        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Required',
            'Location permission is required for Bluetooth scanning. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Location permission is required for Bluetooth scanning.',
            [{ text: 'OK' }]
          );
        }

        return false;
      }
    }
    // Android 5 and below - permissions granted at install time
    else {
      console.log('📱 Android 5 or below - permissions granted at install');
      return true;
    }
  } catch (error: any) {
    console.error('❌ Error requesting permissions:', error);
    Alert.alert('Error', `Failed to request permissions: ${error.message}`);
    return false;
  }
}

/**
 * Check if BLE permissions are currently granted
 */
export async function checkBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const androidVersion = Platform.Version as number;

  try {
    if (androidVersion >= 31) {
      const scanGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const connectGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );

      return scanGranted && connectGranted;
    } else if (androidVersion >= 23) {
      const locationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return locationGranted;
    } else {
      return true; // Pre-Android 6
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}
