/**
 * Permission Helper
 * Handles runtime permission requests for BLE on Android
 */

import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

const ANDROID_PERMISSIONS = {
  BLUETOOTH_SCAN: PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
  BLUETOOTH_CONNECT: PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
  ACCESS_FINE_LOCATION: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
} as const;

/**
 * Request all required BLE permissions
 * Returns true if all permissions are granted, false otherwise
 */
export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS handles permissions differently, return true for now
    return true;
  }

  const androidVersion = Platform.Version as number;
  
  // Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
  if (androidVersion >= 31) {
    const permissions: Permission[] = [
      ANDROID_PERMISSIONS.BLUETOOTH_SCAN,
      ANDROID_PERMISSIONS.BLUETOOTH_CONNECT,
    ];

    // Also request location permission (required for BLE scanning)
    permissions.push(ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);

    const results = await Promise.all(
      permissions.map(async (permission) => {
        const checkResult = await check(permission);
        
        if (checkResult === RESULTS.GRANTED) {
          return true;
        }
        
        if (checkResult === RESULTS.DENIED) {
          const requestResult = await request(permission);
          return requestResult === RESULTS.GRANTED;
        }
        
        if (checkResult === RESULTS.BLOCKED) {
          // Permission is blocked, need to open settings
          Alert.alert(
            'Permission Required',
            'Bluetooth permissions are required to connect to your ring. Please enable them in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return false;
        }
        
        return false;
      })
    );

    return results.every((granted) => granted);
  } else {
    // Android 11 and below - only need location permission
    const locationResult = await check(ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
    
    if (locationResult === RESULTS.GRANTED) {
      return true;
    }
    
    if (locationResult === RESULTS.DENIED) {
      const requestResult = await request(ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      return requestResult === RESULTS.GRANTED;
    }
    
    if (locationResult === RESULTS.BLOCKED) {
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
      return false;
    }
    
    return false;
  }
}

/**
 * Check if BLE permissions are granted
 */
export async function checkBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const androidVersion = Platform.Version as number;
  
  if (androidVersion >= 31) {
    const scanResult = await check(ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
    const connectResult = await check(ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
    const locationResult = await check(ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
    
    return (
      scanResult === RESULTS.GRANTED &&
      connectResult === RESULTS.GRANTED &&
      locationResult === RESULTS.GRANTED
    );
  } else {
    const locationResult = await check(ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
    return locationResult === RESULTS.GRANTED;
  }
}
