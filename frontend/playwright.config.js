import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Load E2E-specific env vars (thresholds, credentials) if the file exists.
// Copy .env-e2e-template to .env-e2e and uncomment values to override.
if (existsSync(".env-e2e")) {
  process.loadEnvFile(".env-e2e");
}

// Optional JSON launch options for environments that need a custom browser
// binary or extra flags — e.g. running inside the dev stack's Alpine frontend
// container, where the Playwright-bundled (glibc) Chromium can't run:
//   PLAYWRIGHT_LAUNCH_OPTIONS='{"executablePath":"/usr/bin/chromium-browser","args":["--no-sandbox","--host-resolver-rules=MAP localhost ws-web"]}'
let launchOptions;
if (process.env.PLAYWRIGHT_LAUNCH_OPTIONS) {
  try {
    launchOptions = JSON.parse(process.env.PLAYWRIGHT_LAUNCH_OPTIONS);
  } catch (e) {
    throw new Error(`PLAYWRIGHT_LAUNCH_OPTIONS is not valid JSON: ${e.message}`);
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Run sequentially for timing tests
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for performance tests
  workers: 1, // Single worker for consistent timing
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:9800",
    trace: "on-first-retry",
    // Video recording needs Playwright's bundled ffmpeg. That binary is a glibc
    // build and can't run in the Alpine dev-stack container, so set
    // PLAYWRIGHT_NO_VIDEO=1 there to disable it (host/CI runs keep video).
    video: process.env.PLAYWRIGHT_NO_VIDEO === "1" ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Visual regression snapshot settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // Use a clean context each time
        storageState: undefined,
        launchOptions,
      },
      // Exclude visual regression tests from default project
      testIgnore: "**/visual-regression/**",
    },
    {
      name: "visual-regression",
      testMatch: "**/visual-regression/**/*.spec.js",
      use: {
        browserName: "chromium",
        storageState: undefined,
        launchOptions,
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 800 },
        // Disable animations for stable screenshots
        reducedMotion: "reduce",
        // Consistent pixel ratio
        deviceScaleFactor: 1,
      },
    },
  ],

  // Don't start servers automatically - expect them to be running
  webServer: undefined,
});
