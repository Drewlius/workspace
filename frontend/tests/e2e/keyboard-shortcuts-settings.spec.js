/**
 * End-to-end tests for the customizable keyboard shortcuts list on the
 * Settings > Editor tab (EditorSettingsTab.svelte).
 *
 * Covers:
 * 1. Shortcut rows are keyboard-reachable buttons, and no row nests a
 *    <button> inside another <button> (invalid HTML)
 * 2. Enter on a focused row opens the key-capture editor; Cancel closes it
 * 3. Clicking a row opens the editor too
 *
 * Run with:
 *   npx playwright test keyboard-shortcuts-settings.spec.js
 */

import { test, expect } from "@playwright/test";
import { waitForLoggedIn } from "./helpers.js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:9800";
const TEST_EMAIL = process.env.TEST_EMAIL || "dev@localhost";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "dev";

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.fill("#login-email", TEST_EMAIL);
  await page.fill("#login-password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await waitForLoggedIn(page);
}

test.describe("Keyboard shortcuts settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/settings/#editor`);
    await page.waitForSelector(".shortcuts-list .shortcut-row-clickable", { timeout: 15000 });
  });

  test("rows are accessible buttons with no nested <button>", async ({ page }) => {
    const rows = page.locator(".shortcuts-list .shortcut-row-clickable");
    expect(await rows.count()).toBeGreaterThan(0);

    const first = rows.first();
    await expect(first).toHaveAttribute("role", "button");
    await expect(first).toHaveAttribute("tabindex", "0");

    const nested = await page.locator("button button").count();
    expect(nested, "a <button> must not contain another <button>").toBe(0);
  });

  test("Enter opens the editor and Cancel closes it", async ({ page }) => {
    const first = page.locator(".shortcuts-list .shortcut-row-clickable").first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");

    const editing = page.locator(".shortcuts-list .shortcut-row-editing");
    await expect(editing).toHaveCount(1);
    await expect(editing.locator(".shortcut-input")).toBeFocused();

    await editing.getByRole("button", { name: "Cancel" }).dispatchEvent("mousedown");
    await expect(editing).toHaveCount(0);
  });

  test("click opens the editor", async ({ page }) => {
    await page.locator(".shortcuts-list .shortcut-row-clickable").first().click();
    await expect(page.locator(".shortcuts-list .shortcut-row-editing")).toHaveCount(1);
  });
});
