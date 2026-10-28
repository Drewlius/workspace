/**
 * Unit tests for `playwright.config.js` env handling.
 *
 * Two behaviours the dev-stack (Alpine container) run relies on:
 * - PLAYWRIGHT_LAUNCH_OPTIONS must fail fast with a clear message on bad JSON.
 * - PLAYWRIGHT_NO_VIDEO=1 disables video (its bundled ffmpeg can't run there).
 *
 * defineConfig is mocked to an identity so the config object can be inspected
 * without pulling in the full Playwright test package.
 */

import { describe, test, expect, afterEach, vi } from "vitest";

vi.mock("@playwright/test", () => ({ defineConfig: (config) => config }));

const CONFIG_PATH = "../../playwright.config.js";

async function loadConfig() {
  vi.resetModules();
  const mod = await import(CONFIG_PATH);
  return mod.default;
}

afterEach(() => {
  delete process.env.PLAYWRIGHT_LAUNCH_OPTIONS;
  delete process.env.PLAYWRIGHT_NO_VIDEO;
});

describe("playwright.config — PLAYWRIGHT_LAUNCH_OPTIONS", () => {
  test("throws a clear error when the value is not valid JSON", async () => {
    process.env.PLAYWRIGHT_LAUNCH_OPTIONS = "{ not json";
    await expect(loadConfig()).rejects.toThrow(/not valid JSON/);
  });

  test("parses valid JSON into launchOptions", async () => {
    process.env.PLAYWRIGHT_LAUNCH_OPTIONS = JSON.stringify({
      executablePath: "/usr/bin/chromium-browser",
    });
    const config = await loadConfig();
    const chromium = config.projects.find((p) => p.name === "chromium");
    expect(chromium.use.launchOptions).toEqual({
      executablePath: "/usr/bin/chromium-browser",
    });
  });

  test("leaves launchOptions undefined when unset", async () => {
    const config = await loadConfig();
    const chromium = config.projects.find((p) => p.name === "chromium");
    expect(chromium.use.launchOptions).toBeUndefined();
  });
});

describe("playwright.config — video gating", () => {
  test("PLAYWRIGHT_NO_VIDEO=1 disables video", async () => {
    process.env.PLAYWRIGHT_NO_VIDEO = "1";
    const config = await loadConfig();
    expect(config.use.video).toBe("off");
  });

  test("video defaults to retain-on-failure otherwise", async () => {
    const config = await loadConfig();
    expect(config.use.video).toBe("retain-on-failure");
  });
});
