const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

module.exports = function withPageAlignment(config) {
  // Method 1: Set reactNativeArchitectures in gradle.properties (64-bit only)
  config = withGradleProperties(config, (config) => {
    // Remove existing entry if present
    config.modResults = config.modResults.filter(
      (p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures')
    );
    // Add 64-bit only architectures (arm64-v8a, x86_64 are 16KB aligned)
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a,x86_64',
    });
    return config;
  });

  // Method 2: Add ndk abiFilters to app/build.gradle defaultConfig
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('abiFilters')) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        ndk {
            abiFilters "arm64-v8a", "x86_64"
        }`
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
};
