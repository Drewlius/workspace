/**
 * Demo mode utilities
 *
 * Demo mode allows users to try the editor without logging in.
 * All features work the same, but data is local-only and mutations prompt signup.
 */

import { showToast } from "../lib/toast.js";

/**
 * Check if the app is running in demo mode.
 * Set by Django template via window._isDemoMode
 */
export function isDemoMode() {
  return window._isDemoMode === true;
}

/**
 * Error thrown when a demo user attempts a mutation action
 */
export class DemoModeError extends Error {
  constructor(message) {
    super(message);
    this.name = "DemoModeError";
  }
}

/**
 * Show a friendly prompt encouraging the user to sign up.
 * Used when they try to do something that requires an account.
 */
export function showDemoPrompt(action = "do that") {
  showToast(`Sign up to ${action}`, "info", {
    action: {
      label: "Sign up free",
      onClick: () => {
        window.location.href = "/signup";
      },
    },
    duration: 5000,
  });
}

/**
 * Navigate to signup page
 */
export function goToSignup() {
  window.location.href = "/signup";
}

/**
 * Navigate to login page
 */
export function goToLogin() {
  window.location.href = "/login";
}

// Demo edits are kept in localStorage so a reload doesn't wipe them.
// They never reach the server; signup starts from fresh seed content.
// Caps are measured in JS string length (UTF-16 code units), not bytes — that's
// enough to bound localStorage growth, which is itself UTF-16-backed.
export const DEMO_CONTENT_MAX_CHARS = 500 * 1024;
export const DEMO_TITLE_MAX_CHARS = 1024;

/**
 * Persist edited demo page content in this browser.
 */
export function setDemoContent(pageId, content) {
  try {
    if (content.length > DEMO_CONTENT_MAX_CHARS) return;
    localStorage.setItem(`demo-content-${pageId}`, content);
  } catch {
    // localStorage unavailable or quota exceeded — edits just won't survive reload
  }
}

/**
 * Get locally edited content for a demo page, if any.
 */
export function getDemoContent(pageId) {
  try {
    return localStorage.getItem(`demo-content-${pageId}`);
  } catch {
    return null;
  }
}

/**
 * Persist an edited demo page title in this browser.
 */
export function setDemoTitle(pageId, title) {
  try {
    // A blank title clears the override so the seed title shows again. Simply
    // skipping the write would leave any previously-stored title in place, so
    // clearing a renamed page would keep the old custom title instead.
    if (!title.trim()) {
      localStorage.removeItem(`demo-title-${pageId}`);
      return;
    }
    if (title.length > DEMO_TITLE_MAX_CHARS) return;
    localStorage.setItem(`demo-title-${pageId}`, title);
  } catch {
    // localStorage unavailable or quota exceeded — edits just won't survive reload
  }
}

/**
 * Get a locally edited title for a demo page, if any.
 */
export function getDemoTitle(pageId) {
  try {
    return localStorage.getItem(`demo-title-${pageId}`);
  } catch {
    return null;
  }
}

/**
 * Store a filetype override for a demo page.
 * This persists across page reloads within the session.
 */
export function setDemoFiletype(pageId, filetype) {
  try {
    sessionStorage.setItem(`demo-filetype-${pageId}`, filetype);
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Get a filetype override for a demo page, if any.
 */
export function getDemoFiletype(pageId) {
  try {
    return sessionStorage.getItem(`demo-filetype-${pageId}`);
  } catch {
    return null;
  }
}
