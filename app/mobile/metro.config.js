const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Ensure fast refresh works reliably
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];

// Reset transform cache to avoid stale bundles
config.resetCache = false;

module.exports = withNativeWind(config, { input: "./global.css" });
