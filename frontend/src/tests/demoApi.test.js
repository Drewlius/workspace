/**
 * Unit tests for `demo/demoApi.js` page-link resolution.
 *
 * The demo lets a visitor edit page content locally (persisted to
 * localStorage). `fetchPageLinks()` must compute outgoing links and backlinks
 * from that edited content, not from the original seed content — otherwise the
 * Ref tab goes stale the moment a link is added or removed and reloaded.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { fetchPageLinks } from "../demo/demoApi.js";
import { STRESS_PAGE_ID } from "../demo/demoContent.js";
import { setDemoContent } from "../demo/index.js";

describe("demoApi.fetchPageLinks reflects locally edited demo content", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("without edits, links fall back to seed content", async () => {
    const { outgoing } = await fetchPageLinks("demo-spec");
    const ids = outgoing.map((l) => l.external_id);

    // The seed spec links out to the roadmap, the sync notes, and the launch page.
    expect(ids).toContain("demo-roadmap");
    expect(ids).toContain("demo-sync");
    expect(ids).toContain("demo-launch");
  });

  test("outgoing links come from the current page's edited content", async () => {
    // Replace the spec body with a single internal link.
    setDemoContent("demo-spec", "See the [Roadmap](/pages/demo-roadmap/) and nothing else.");

    const { outgoing } = await fetchPageLinks("demo-spec");
    const ids = outgoing.map((l) => l.external_id);

    expect(ids).toEqual(["demo-roadmap"]);
    // Seed links that were edited away no longer appear.
    expect(ids).not.toContain("demo-sync");
    expect(ids).not.toContain("demo-launch");
  });

  test("backlinks come from each source page's edited content", async () => {
    // The seed postmortem does not link to the spec; add such a link locally.
    setDemoContent("demo-postmortem", "Follow-up on the [spec](/pages/demo-spec/).");

    const { incoming } = await fetchPageLinks("demo-spec");
    const ids = incoming.map((l) => l.external_id);

    expect(ids).toContain("demo-postmortem");
  });

  test("removing a link in a source page drops the backlink", async () => {
    // The seed roadmap links to the spec; edit that link away.
    setDemoContent("demo-roadmap", "No links here anymore.");

    const { incoming } = await fetchPageLinks("demo-spec");
    const ids = incoming.map((l) => l.external_id);

    expect(ids).not.toContain("demo-roadmap");
  });
});

describe("demoApi.fetchPageLinks and the generated stress page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("unedited stress page has no outgoing links (seed body is never read)", async () => {
    const { outgoing, incoming } = await fetchPageLinks(STRESS_PAGE_ID);

    expect(outgoing).toEqual([]);
    // Start Here links to the stress page; that backlink is still computed
    // cheaply from the other pages' content.
    expect(incoming.map((l) => l.external_id)).toContain("demo-start-here");
  });

  test("a small stored edit's links are reported (never the 5 MB seed)", async () => {
    // The seed stress body has no links; this small stored override does. Its
    // link surfacing proves outgoing comes from the stored edit, not the seed.
    setDemoContent(STRESS_PAGE_ID, "A [spec](/pages/demo-spec/) link.");

    const { outgoing, incoming } = await fetchPageLinks(STRESS_PAGE_ID);

    expect(outgoing.map((l) => l.external_id)).toEqual(["demo-spec"]);
    // Backlinks to the stress page are unaffected.
    expect(incoming.map((l) => l.external_id)).toContain("demo-start-here");
  });
});
