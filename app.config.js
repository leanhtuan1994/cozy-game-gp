const { withEntitlementsPlist } = require("expo/config-plugins");

// expo-notifications always adds the push entitlement, but the game only schedules local
// notifications; without this, signing would need an App ID with Push Notifications.
const withoutPushEntitlement = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });

module.exports = {
  expo: {
    name: "Ghép Phố",
    slug: "ghep-pho",
    scheme: "ghep-pho",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    // 1024 px, no alpha (App Store Connect rejects an icon with transparency).
    icon: "./assets/icon.png",
    ios: {
      bundleIdentifier: "vn.ghep-pho.app",
      supportsTablet: false,
      infoPlist: {
        // expo-audio links the recorder, so App Store Connect asks for this string even though the
        // game never records. Set here rather than through the expo-audio plugin, whose defaults
        // would also add background audio, which the game does not use.
        NSMicrophoneUsageDescription: "Ghép Phố không thu âm. Dòng này có vì thư viện âm thanh của game yêu cầu.",
        // The game uses no encryption beyond what iOS provides.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      "expo-router",
      // Embedded at build time (UIAppFonts) so RN <Text> and Skia's CoreText font manager both see them.
      [
        "expo-font",
        {
          ios: {
            fonts: [
              "./assets/fonts/BeVietnamPro-Regular.ttf",
              "./assets/fonts/BeVietnamPro-SemiBold.ttf",
              "./assets/fonts/BeVietnamPro-Bold.ttf",
              // Display face for titles, buttons and numbers.
              "./assets/fonts/Baloo2-Bold.ttf",
              "./assets/fonts/Baloo2-ExtraBold.ttf",
            ],
          },
        },
      ],
      ["expo-splash-screen", { backgroundColor: "#FFF4E0", image: "./assets/splash.png", imageWidth: 240 }],
      // Listed before expo-notifications: plist mods run in reverse order, so this one runs after it.
      withoutPushEntitlement,
      "expo-notifications",
      "expo-status-bar",
    ],
  },
};
