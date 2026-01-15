const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add ProGuard rules for react-native-ble-manager
 */
const withProGuardRules = (config) => {
  return withAppBuildGradle(config, (config) => {
    const proguardRulesPath = path.join(
      config.modRequest.platformProjectRoot,
      'app',
      'proguard-rules.pro'
    );

    // ProGuard rules for react-native-ble-manager
    const bleManagerRules = `
# react-native-ble-manager
-keep class it.innove.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-dontwarn it.innove.**
`;

    // Read existing rules if file exists
    let existingRules = '';
    if (fs.existsSync(proguardRulesPath)) {
      existingRules = fs.readFileSync(proguardRulesPath, 'utf8');
    }

    // Only add if not already present
    if (!existingRules.includes('react-native-ble-manager')) {
      const updatedRules = existingRules + bleManagerRules;
      fs.writeFileSync(proguardRulesPath, updatedRules, 'utf8');
    }

    return config;
  });
};

module.exports = withProGuardRules;
