const { withAndroidManifest, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

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

  // Ensure autolinking is enabled and native modules are included
  config = withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Ensure autolinkLibrariesWithApp() is present (should be there by default)
    if (!buildGradle.includes('autolinkLibrariesWithApp()')) {
      // This should already be there from expo-dev-client, but ensure it
      config.modResults.contents = buildGradle.replace(
        /react\s*\{/,
        `react {
    /* Autolinking */
    autolinkLibrariesWithApp()
`
      );
    }

    return config;
  });

  return config;
};

module.exports = function (config) {
  config = withBLEManager(config);
  return config;
};
