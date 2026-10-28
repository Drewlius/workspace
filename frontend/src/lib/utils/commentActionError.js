/**
 * Classify an error thrown by a comment / AI-review action into a UI outcome.
 *
 * Pure and side-effect-free (no toast/console/DOM), so the catch-block decision
 * can be unit-tested directly instead of asserting on component source.
 *
 * Returns one of:
 *   { kind: "demo", message }  — demo mode gated the action; show the signup
 *                                prompt with `message` (do NOT log an error).
 *   { kind: "ai_key" }         — no AI provider configured; show the settings toast.
 *   { kind: "generic" }        — anything else; caller shows its generic toast.
 */

import { DemoModeError } from "../../demo/index.js";

export function classifyCommentActionError(e) {
  if (e instanceof DemoModeError) {
    return { kind: "demo", message: e.message };
  }
  if (e?.code === "ai_key_not_configured") {
    return { kind: "ai_key" };
  }
  return { kind: "generic" };
}
