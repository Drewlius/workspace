/**
 * Unit tests for demo title persistence (`demo/index.js`).
 *
 * A blank title must CLEAR the stored override so the seed title returns —
 * merely skipping the write would leave a previously-stored title in place, so
 * clearing a renamed page would keep the old custom title.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { setDemoTitle, getDemoTitle, DEMO_TITLE_MAX_CHARS } from "../demo/index.js";
import { fetchProjectsWithPages } from "../demo/demoApi.js";

describe("demo title persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("stores and reads back a non-blank title", () => {
    setDemoTitle("demo-spec", "My Spec");
    expect(getDemoTitle("demo-spec")).toBe("My Spec");
  });

  test("a blank title removes an existing stored override", () => {
    setDemoTitle("demo-spec", "My Spec");
    setDemoTitle("demo-spec", "");
    expect(getDemoTitle("demo-spec")).toBeNull();
  });

  test("a whitespace-only title also clears the override", () => {
    setDemoTitle("demo-spec", "My Spec");
    setDemoTitle("demo-spec", "   ");
    expect(getDemoTitle("demo-spec")).toBeNull();
  });

  test("a title over the size cap is not stored", () => {
    const huge = "x".repeat(DEMO_TITLE_MAX_CHARS + 1);
    setDemoTitle("demo-spec", huge);
    expect(getDemoTitle("demo-spec")).toBeNull();
  });

  test("the cap counts code units, not bytes", () => {
    // 1000 CJK chars = 1000 UTF-16 code units (< the char cap) but ~3000 UTF-8
    // bytes. A byte cap would reject this; the code-unit cap stores it.
    const title = "文".repeat(1000);
    expect(title.length).toBeLessThan(DEMO_TITLE_MAX_CHARS);
    setDemoTitle("demo-spec", title);
    expect(getDemoTitle("demo-spec")).toBe(title);
  });

  test("clearing a title falls back to the seed title in the project list", async () => {
    setDemoTitle("demo-spec", "Renamed");
    let projects = await fetchProjectsWithPages();
    let spec = projects[0].pages.find((p) => p.external_id === "demo-spec");
    expect(spec.title).toBe("Renamed");

    setDemoTitle("demo-spec", "");
    projects = await fetchProjectsWithPages();
    spec = projects[0].pages.find((p) => p.external_id === "demo-spec");
    expect(spec.title).not.toBe("Renamed");
    expect(spec.title).toMatch(/Subscription Revamp/);
  });
});
