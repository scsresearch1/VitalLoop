const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to ensure react-native-ble-manager native module is included
 * This ensures permissions are set and native module is properly linked
 */
const withBLEManager = (config) => {
  // Ensure BLE permissions are in AndroidManifest
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Ensure permissions exist
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [manifest['uses-permission']];

    const requiredPermissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    requiredPermissions.forEach((permissionName) => {
      const exists = permissions.some(
        (p) => p.$ && p.$['android:name'] === permissionName
      );
      if (!exists) {
        permissions.push({ $: { 'android:name': permissionName } });
      }
    });

    manifest['uses-permission'] = permissions;

    return config;
  });

  // Ensure autolinking is enabled (should be default, but making sure)
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];
    
    // Ensure React Native autolinking is enabled
    const hasAutolinking = config.modResults.some(
      (item) => item.type === 'property' && item.key === 'expo.autolinking.enabled'
    );
    
    if (!hasAutolinking) {
      config.modResults.push({
        type: 'property',
        key: 'expo.autolinking.enabled',
        value: 'true',
      });
    }

    return config;
  });

  return config;
};

module.exports = function (config) {
  config = withBLEManager(config);
  return config;
};
