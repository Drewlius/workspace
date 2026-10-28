/**
 * End-to-end tests for the no-login demo (/demo/).
 *
 * The demo runs entirely on canned data (frontend/src/demo/), so these tests
 * need no auth and no database seeding — just a running stack.
 *
 * Covers (see specs/demo-experience.md):
 * 1. Demo loads the seeded Peregrine Coffee workspace
 * 2. A full browse session (tabs + CSV/log/stress pages) produces no console
 *    errors or failed requests
 * 3. Discuss tab: explainer card, seeded threads, mutations → signup prompt
 *    (and no console error for the gated action)
 * 4. Rewind tab (only when REWIND_ENABLED): canned timeline + diff view
 * 5. Ask tab: canned example Q&A
 * 6. Ref tab: backlinks computed from seed content
 * 7. An edited internal link updates the Ref tab after reload
 * 8. Stress page (~5 MB / 54k lines) renders fast
 * 9. Body and title edits survive a reload (localStorage persistence); clearing
 *    a title via the input coerces to "Untitled" and persists
 *
 * Run with:
 *   npx playwright test demo-mode.spec.js
 *
 * No host node? Run inside the dev stack's frontend container (chromium is
 * baked into Dockerfile-frontend). PLAYWRIGHT_NO_VIDEO disables video, whose
 * ffmpeg isn't available in the Alpine container. -u $(id -u):$(id -g) runs as
 * the host user so test-results/ and playwright-report/ stay host-owned (docker
 * exec defaults to root, which leaves root-owned artifacts that later break
 * host-side runs):
 *   docker exec -u $(id -u):$(id -g) -w /app \
 *     -e TEST_BASE_URL=http://localhost:9800 \
 *     -e PLAYWRIGHT_NO_VIDEO=1 \
 *     -e PLAYWRIGHT_LAUNCH_OPTIONS='{"executablePath":"/usr/bin/chromium-browser","args":["--no-sandbox","--host-resolver-rules=MAP localhost ws-web"]}' \
 *     <container> npx playwright test demo-mode.spec.js
 */

import { test, expect } from "@playwright/test";
import { waitForEditorContent } from "./helpers.js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:9800";

async function openDemo(page) {
  await page.goto(`${BASE_URL}/demo/`);
  await page.waitForSelector(".cm-content", { timeout: 20000 });
}

/** Expand a sidenav folder and open a page inside it. */
async function openDemoPage(page, folderName, pageTitle, expectedContent) {
  await page.click(`text=${folderName}`);
  await page.click(`text=${pageTitle}`);
  await waitForEditorContent(page, expectedContent);
}

async function openSidebarTab(page, label) {
  await page.click(`.sidebar-tab:has-text("${label}")`);
}

test.describe("Demo mode", () => {
  test("loads the seeded workspace without auth", async ({ page }) => {
    await openDemo(page);

    // Start Here is the landing page
    await waitForEditorContent(page, "Peregrine Coffee");

    // Seeded sidenav structure
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toContain("Peregrine Coffee"); // project
    expect(body).toContain("Data"); // folders
    expect(body).toContain("Operations");
    expect(body).toContain("Product");
    expect(body).toContain("Start Here");

    // Demo banner with signup CTA
    await expect(page.locator("text=Sign up").first()).toBeVisible();
  });

  test("full browse session has no console errors or failed requests", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
    });

    await openDemo(page);
    await openDemoPage(page, "Product", "Subscription Revamp", "Cadence picker");

    // Sweep the sidebar tabs on the spec page
    await openSidebarTab(page, "Discuss");
    await page.waitForTimeout(1000);
    await openSidebarTab(page, "Ref");
    await page.waitForTimeout(1000);
    await openSidebarTab(page, "Ask");
    await page.waitForTimeout(500);

    // Rewind only renders behind its feature flag
    const rewindTab = page.locator('.sidebar-tab:has-text("Rewind")');
    if ((await rewindTab.count()) > 0) {
      await rewindTab.click();
      await page.waitForTimeout(500);
    }

    // Visit the CSV, log, and stress pages under Data
    await page.click("text=Data");
    await page.click("text=Supplier Contacts");
    await page.waitForTimeout(800);
    await page.click("text=Storefront Logs");
    await page.waitForTimeout(800);
    await page.click("text=Stress Test");
    await waitForEditorContent(page, "52,000 lines", 20000);

    expect(errors).toEqual([]);
  });

  test("Discuss tab shows explainer and seeded threads on the spec", async ({ page }) => {
    await openDemo(page);
    await openDemoPage(page, "Product", "Subscription Revamp", "Cadence picker");
    await openSidebarTab(page, "Discuss");

    // Demo explainer card
    await expect(page.locator("text=This is the Discuss tab")).toBeVisible();

    // Human thread (Jonas + Maya reply) and AI persona threads
    await expect(page.locator("text=Two months is a long time")).toBeVisible();
    await expect(page.locator("text=the other 62%")).toBeVisible();
    await expect(page.locator("text=leading metrics")).toBeVisible();
  });

  test("Discuss mutations prompt signup instead of erroring", async ({ page }) => {
    // Collect console errors / page errors up front — a gated demo action must
    // surface the signup prompt without logging an error.
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await openDemo(page);
    await openDemoPage(page, "Product", "Subscription Revamp", "Cadence picker");
    await openSidebarTab(page, "Discuss");

    // Trigger an AI persona review — a demo mutation
    await page.click(".ai-trigger-btn >> nth=0");

    const toast = page.locator("#svelte-toast-root");
    await expect(toast).toContainText(/Sign up to/i, { timeout: 5000 });
    // Must NOT be surfaced as a generic failure
    await expect(toast).not.toContainText(/couldn't|failed/i);

    // ...and must not have logged an error for the expected gated action
    expect(errors).toEqual([]);
  });

  test("Rewind tab shows canned history with a working diff", async ({ page }) => {
    await openDemo(page);
    await openDemoPage(page, "Product", "Subscription Revamp", "Cadence picker");

    // Rewind is behind REWIND_ENABLED — skip when the tab isn't rendered
    const rewindTab = page.locator('.sidebar-tab:has-text("Rewind")');
    test.skip((await rewindTab.count()) === 0, "REWIND_ENABLED is off");

    await rewindTab.click();
    await expect(page.locator(".rewind-timeline")).toContainText("v4");
    await expect(page.locator(".rewind-timeline")).toContainText("Fulfillment confirmed");
    await expect(page.locator(".rewind-timeline")).toContainText("After churn survey");

    // Open an entry — the diff viewer replaces the editor
    await page.click(".rewind-timeline >> text=v3");
    await expect(page.locator("#rewind-exit-btn")).toBeVisible({ timeout: 10000 });
    await page.click("#rewind-exit-btn");
    await expect(page.locator(".cm-content")).toBeVisible();
  });

  test("Ask tab shows the canned example Q&A", async ({ page }) => {
    await openDemo(page);
    await openSidebarTab(page, "Ask");
    await expect(page.locator("text=Why did checkout fail during the March drop?")).toBeVisible();
    await expect(page.locator(".demo-signup-btn")).toBeVisible();
  });

  test("Ref tab shows backlinks computed from seed content", async ({ page }) => {
    await openDemo(page);
    await openDemoPage(page, "Product", "Subscription Revamp", "Cadence picker");
    await openSidebarTab(page, "Ref");

    // Several seed pages link to the spec (Ref tab's id is "links")
    const panel = page.locator('[data-tab-content="links"]');
    await expect(panel).toContainText("Start Here");
    await expect(panel).toContainText("Weekly Sync");
  });

  test("an edited internal link updates the Ref tab after reload", async ({ page }) => {
    await openDemo(page);
    // Start Here is the landing page and is restored on reload.
    await waitForEditorContent(page, "Peregrine Coffee");

    // Baseline: Start Here does not link to the roadmap yet.
    await openSidebarTab(page, "Ref");
    const panel = page.locator('[data-tab-content="links"]');
    await expect(panel).not.toContainText("2026 Roadmap");

    // Add an internal link via a real editor edit (dispatching avoids the
    // link-autocomplete popup that typing "[" would trigger), then let the
    // 500ms demo persistence debounce flush.
    await page.evaluate(() => {
      const view = window.editorView;
      view.dispatch({
        changes: {
          from: view.state.doc.length,
          insert: "\n\nSee the [2026 Roadmap](/pages/demo-roadmap/).\n",
        },
      });
    });
    await page.waitForTimeout(900);

    await page.reload();
    await page.waitForSelector(".cm-content", { timeout: 20000 });
    // Edited body is restored from localStorage.
    await waitForEditorContent(page, "2026 Roadmap");

    // The Ref tab now lists the newly added link (computed from edited content).
    await openSidebarTab(page, "Ref");
    await expect(page.locator('[data-tab-content="links"]')).toContainText("2026 Roadmap");
  });

  test("stress page (~5 MB) renders fast", async ({ page }) => {
    await openDemo(page);
    await page.click("text=Data");

    const t0 = Date.now();
    await page.click("text=Stress Test");
    await waitForEditorContent(page, "52,000 lines", 20000);
    const elapsed = Date.now() - t0;

    console.log(`stress page visible in ${elapsed}ms`);
    // Generous bound for slow CI machines; locally this is under 200ms.
    expect(elapsed).toBeLessThan(5000);
  });

  test("body and title edits survive a reload", async ({ page }) => {
    await openDemo(page);
    await waitForEditorContent(page, "Peregrine Coffee");

    // Type a marker into the body (demo persistence debounce is 500ms)
    await page.click(".cm-content");
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" E2E-PERSIST-MARKER");
    await page.waitForTimeout(900);

    // Rename the page
    await page.fill("#note-title-input", "Start Here E2E");
    await page.press("#note-title-input", "Enter");
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForSelector(".cm-content", { timeout: 20000 });
    await waitForEditorContent(page, "E2E-PERSIST-MARKER");
    await expect(page.locator("#note-title-input")).toHaveValue(/Start Here E2E/);
  });

  test("renaming and clearing the title via the input persists across reload", async ({ page }) => {
    await openDemo(page);
    await waitForEditorContent(page, "Peregrine Coffee");

    // Rename via the title input, then reload: the custom title survives.
    await page.fill("#note-title-input", "Renamed In UI");
    await page.press("#note-title-input", "Enter");
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForSelector(".cm-content", { timeout: 20000 });
    await expect(page.locator("#note-title-input")).toHaveValue("Renamed In UI");

    // Clearing the input: the app coerces an empty title to "Untitled" (it never
    // stores an empty title), and that survives reload.
    await page.fill("#note-title-input", "");
    await page.press("#note-title-input", "Enter");
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForSelector(".cm-content", { timeout: 20000 });
    await expect(page.locator("#note-title-input")).toHaveValue("Untitled");
  });
});
