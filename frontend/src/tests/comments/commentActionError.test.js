/**
 * Behavioral tests for `classifyCommentActionError` — the pure decision the
 * CommentsTab AI-review / apply-suggestion catch blocks route through.
 *
 * Testing the classifier directly (instead of asserting on component source)
 * verifies the runtime behavior: a demo-gated action is classified as "demo"
 * (→ signup prompt, no error log) while real failures fall through to the
 * logging + toast paths.
 */

import { describe, test, expect } from "vitest";
import { classifyCommentActionError } from "../../lib/utils/commentActionError.js";
import { DemoModeError } from "../../demo/index.js";

describe("classifyCommentActionError", () => {
  test("DemoModeError → demo outcome carrying the message", () => {
    const out = classifyCommentActionError(new DemoModeError("use AI review"));
    expect(out).toEqual({ kind: "demo", message: "use AI review" });
  });

  test("ai_key_not_configured code → ai_key outcome", () => {
    expect(classifyCommentActionError({ code: "ai_key_not_configured" })).toEqual({
      kind: "ai_key",
    });
  });

  test("any other error → generic outcome", () => {
    expect(classifyCommentActionError(new Error("boom"))).toEqual({ kind: "generic" });
  });

  test("null / undefined → generic outcome (no throw)", () => {
    expect(classifyCommentActionError(null)).toEqual({ kind: "generic" });
    expect(classifyCommentActionError(undefined)).toEqual({ kind: "generic" });
  });

  test("DemoModeError takes precedence over an ai_key code", () => {
    const e = new DemoModeError("add comments");
    e.code = "ai_key_not_configured";
    expect(classifyCommentActionError(e)).toEqual({ kind: "demo", message: "add comments" });
  });
});
