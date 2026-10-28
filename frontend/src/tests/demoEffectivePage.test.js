/**
 * Unit tests for `getEffectiveDemoPage` and demo content persistence caps.
 *
 * `getEffectiveDemoPage` layers a visitor's local edits (title + content) over
 * the seed page. `setDemoContent` bounds what it stores so a pathological edit
 * can't blow out localStorage.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { getEffectiveDemoPage } from "../demo/demoApi.js";
import {
  setDemoContent,
  getDemoContent,
  setDemoTitle,
  DEMO_CONTENT_MAX_CHARS,
} from "../demo/index.js";

describe("getEffectiveDemoPage applies local demo edits", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("falls back to seed content when there is no stored edit", () => {
    const page = getEffectiveDemoPage("demo-spec");
    expect(page.details.content).toMatch(/Cadence picker/);
  });

  test("applies stored content over the seed content", () => {
    setDemoContent("demo-spec", "edited body");
    expect(getEffectiveDemoPage("demo-spec").details.content).toBe("edited body");
  });

  test("applies a stored title over the seed title", () => {
    setDemoTitle("demo-spec", "Renamed Spec");
    expect(getEffectiveDemoPage("demo-spec").title).toBe("Renamed Spec");
  });

  test("returns null for an unknown page id", () => {
    expect(getEffectiveDemoPage("nope")).toBeNull();
  });
});

describe("setDemoContent size cap", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("does not store content over the byte cap", () => {
    setDemoContent("demo-spec", "x".repeat(DEMO_CONTENT_MAX_CHARS + 1));
    expect(getDemoContent("demo-spec")).toBeNull();
  });

  test("stores content under the cap", () => {
    const body = "y".repeat(1000);
    setDemoContent("demo-spec", body);
    expect(getDemoContent("demo-spec")).toBe(body);
  });
});
