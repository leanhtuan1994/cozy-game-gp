const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Rive motion files are bundled as assets and loaded with require().
config.resolver.assetExts.push("riv");

module.exports = config;
