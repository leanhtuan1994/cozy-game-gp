const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", "ios/*", "android/*", ".expo/*", "design/*"] },
  {
    // Metro bundles images and motion files through require().
    files: ["src/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // The UI changes the game only through GameCommands (src/store/GameContext.tsx). Read-only
    // helpers (board queries, hit test, geometry, completedCount) stay importable; type imports
    // of anything are fine.
    files: ["src/app/**/*.{ts,tsx}", "src/hud/**/*.{ts,tsx}", "src/scene/**/*.{ts,tsx}", "src/motion/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/engine/puzzle/rules", message: "Call GameCommands from useGame() instead of running rules in the UI.", allowTypeImports: true },
            { name: "@/engine/puzzle/solver", message: "Hints come from GameCommands.useBooster(\"hint\").", allowTypeImports: true },
            { name: "@/engine/puzzle/tray", message: "Tray rules run in the engine; import TRAY_CAPACITY from @/engine/puzzle/constants.", allowTypeImports: true },
            { name: "@/engine/meta/progress", importNames: ["recordWin"], message: "Wins are recorded by GameSession.", allowTypeImports: true },
            {
              name: "@/engine/meta/meta",
              importNames: ["claim", "recordRun", "recordBoosterUse", "visit"],
              message: "Claims and daily visits go through GameCommands.",
              allowTypeImports: true,
            },
            { name: "@/store/session", message: "Use useGame() from @/store/GameContext.", allowTypeImports: true },
            { name: "@/store/save", message: "The save is read through useGame().snapshot.", allowTypeImports: true },
            { name: "@/store/storage", message: "Storage is owned by the session.", allowTypeImports: true },
          ],
          patterns: [
            {
              group: ["**/engine/puzzle/rules", "**/engine/puzzle/solver", "**/engine/puzzle/tray", "**/store/session", "**/store/save", "**/store/storage"],
              message: "Use the @/ path; this module is closed to UI code (see the rule above).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-*",
                "react-native*",
                "expo",
                "expo-*",
                "@rive-app/*",
                "@/scene/*",
                "@/hud/*",
                "@/app/*",
                "@/motion/*",
                "**/scene/**",
                "**/hud/**",
                "**/app/**",
                "**/motion/**",
              ],
              message: "src/engine must stay pure TypeScript (see docs/architecture.md).",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded RNG in src/engine/rng.ts." },
        { object: "Date", property: "now", message: "The engine receives `now` from its caller." },
        { object: "performance", property: "now", message: "The engine receives `now` from its caller." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "The engine receives `now` from its caller." },
        { selector: "CallExpression[callee.name='Date']", message: "The engine receives `now` from its caller." },
      ],
    },
  },
]);
