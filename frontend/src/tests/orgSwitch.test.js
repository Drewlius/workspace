/**
 * Unit tests for the pure helpers extracted into `lib/orgSwitch.js`.
 *
 * `pickTargetPageForOrg` is the post-switch "where do we land?" logic.
 * It's branchy and easy to get subtly wrong — the e2e tests only exercise
 * a couple of paths through it. These pin the rest at the source.
 *
 * `createOrgSwitchController` owns two pieces of concurrency-sensitive
 * state — a monotonic switch sequence (drops stale post-fetch renders
 * when the user rapidly cycles A→B) and a per-org in-flight map
 * (coalesces concurrent bootstraps of the same empty org). Both are
 * pinned below by interleaving controlled async resolutions and
 * asserting that only one effect lands.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

// `vi.hoisted` is the only safe way to declare state that's reachable from
// both a `vi.mock` factory and the test body — plain module-level `let`s
// hit TDZ because mock factories run during module resolution (before any
// other module-level code).
const mockState = vi.hoisted(() => ({ handler: null }));

// Mock orgContext so installHandler's setOrgChangedHandler call hands the
// handler to the test instead of the real module — we drive it directly
// to simulate the rapid-switch race without depending on setCurrentOrgId
// (which doesn't await the handler we'd want to observe). The other
// exports (setAvailableOrgs) are stubbed so refreshAvailableOrgs is
// callable.
vi.mock("../lib/orgContext.js", () => ({
  setAvailableOrgs: vi.fn(),
  setOrgChangedHandler: vi.fn((h) => {
    mockState.handler = h;
  }),
}));

// Mock api.js so refreshAvailableOrgs / fetchOrgs doesn't try to hit the
// network during installHandler tests.
vi.mock("../api.js", () => ({
  fetchOrgs: vi.fn(async () => []),
}));

import { pickTargetPageForOrg, createOrgSwitchController } from "../lib/orgSwitch.js";

describe("pickTargetPageForOrg", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("returns the last-viewed page when it's still present in the org", () => {
    localStorage.setItem("last-page-per-org", JSON.stringify({ "org-1": "page-resume" }));
    const projects = [
      {
        external_id: "proj-1",
        pages: [{ external_id: "page-other" }, { external_id: "page-resume" }],
      },
    ];

    expect(pickTargetPageForOrg("org-1", projects)).toBe("page-resume");
  });

  test("falls back to the first project's first page when the last-viewed is gone", () => {
    localStorage.setItem("last-page-per-org", JSON.stringify({ "org-1": "page-deleted" }));
    const projects = [
      {
        external_id: "proj-1",
        pages: [{ external_id: "page-first" }, { external_id: "page-second" }],
      },
    ];

    expect(pickTargetPageForOrg("org-1", projects)).toBe("page-first");
  });

  test("clears the stale last-viewed entry when it points at a missing page", () => {
    localStorage.setItem(
      "last-page-per-org",
      JSON.stringify({ "org-1": "page-deleted", "org-2": "page-survives" })
    );
    const projects = [{ external_id: "proj-1", pages: [{ external_id: "page-first" }] }];

    pickTargetPageForOrg("org-1", projects);

    const stored = JSON.parse(localStorage.getItem("last-page-per-org") || "{}");
    expect(stored["org-1"]).toBeUndefined();
    // Other orgs' entries are not collateral damage.
    expect(stored["org-2"]).toBe("page-survives");
  });

  test("returns null when the org has no projects at all", () => {
    expect(pickTargetPageForOrg("org-1", [])).toBeNull();
    expect(pickTargetPageForOrg("org-1", null)).toBeNull();
  });

  test("returns null when every project in the org is empty", () => {
    const projects = [
      { external_id: "proj-1", pages: [] },
      { external_id: "proj-2", pages: [] },
    ];

    expect(pickTargetPageForOrg("org-1", projects)).toBeNull();
  });

  test("skips empty projects to reach a non-empty one", () => {
    const projects = [
      { external_id: "proj-empty", pages: [] },
      { external_id: "proj-with-pages", pages: [{ external_id: "page-x" }] },
    ];

    expect(pickTargetPageForOrg("org-1", projects)).toBe("page-x");
  });
});

/**
 * Helper to build a deferred promise so the test can resolve fetches in a
 * controlled order. Lets us interleave two org-switches in flight and
 * assert which one's render wins.
 */
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * Build a controller with stubbed deps so the test owns every external
 * effect (fetchProjects, renderSidenav, openPage, etc.). `deps.fetchProjects`
 * defaults to a deferred so the test can choose when each call resolves.
 */
function buildController(overrides = {}) {
  const fetchDeferreds = [];
  // The handler writes via setCachedProjects and then navigateToOrgEntryPage
  // reads back via getCachedProjects. If the two aren't wired together the
  // navigate step thinks the org is empty, falls into bootstrap, and calls
  // fetchProjects a third time — which deadlocks on an unresolved deferred.
  let cachedProjects = [];
  const deps = {
    isDemoMode: () => false,
    getCachedProjects: vi.fn(() => cachedProjects),
    setCachedProjects: vi.fn((projects) => {
      cachedProjects = Array.isArray(projects) ? projects : [];
    }),
    getCurrentPage: vi.fn(() => null),
    fetchProjects: vi.fn(() => {
      const d = deferred();
      fetchDeferreds.push(d);
      return d.promise;
    }),
    renderSidenav: vi.fn(),
    openPage: vi.fn(async () => {}),
    createProjectApi: vi.fn(async (orgId, name) => ({
      external_id: `proj-${orgId}`,
      name,
      pages: [],
    })),
    createPageApi: vi.fn(async (projectId, title) => ({
      external_id: `page-${projectId}`,
      title,
    })),
    showToast: vi.fn(),
    patchCurrentOrg: vi.fn(async () => {}),
    ...overrides,
  };
  return { controller: createOrgSwitchController(deps), deps, fetchDeferreds };
}

describe("createOrgSwitchController — rapid switch race (orgSwitchSeq)", () => {
  beforeEach(() => {
    mockState.handler = null;
    localStorage.clear();
  });

  test("a superseded switch (A) does not clobber the newer switch's (B) render", async () => {
    // Sequence:  user picks A → before A's fetch resolves, user picks B.
    // When A's fetch finally returns it must NOT render — otherwise the
    // user briefly sees A's projects in the sidenav even though they're
    // already looking at B's editor. The seq guard inside the installed
    // handler is the only thing standing between the user and that
    // flicker.
    const { controller, deps, fetchDeferreds } = buildController();
    controller.installHandler();

    // Captured from the mocked setOrgChangedHandler.
    expect(mockState.handler).toBeTypeOf("function");

    // Kick off two switches back-to-back. Each `await fetchProjects()`
    // suspends inside the handler, so both runs sit at the await point
    // until we resolve their respective deferreds below.
    const runA = mockState.handler("org-A");
    const runB = mockState.handler("org-B");

    // Yield once so both handlers reach their `await deps.fetchProjects()`
    // and both deferreds are registered.
    await Promise.resolve();
    expect(fetchDeferreds).toHaveLength(2);

    // Resolve A's fetch first — A's seq (1) is now stale (orgSwitchSeq=2),
    // so its post-fetch render block must be skipped.
    fetchDeferreds[0].resolve([{ external_id: "proj-A", pages: [{ external_id: "page-A1" }] }]);
    await runA;

    expect(deps.setCachedProjects).not.toHaveBeenCalled();
    expect(deps.renderSidenav).not.toHaveBeenCalled();

    // Resolve B's fetch — B's seq matches, so its render proceeds.
    fetchDeferreds[1].resolve([{ external_id: "proj-B", pages: [{ external_id: "page-B1" }] }]);
    await runB;

    expect(deps.setCachedProjects).toHaveBeenCalledTimes(1);
    expect(deps.setCachedProjects.mock.calls[0][0][0].external_id).toBe("proj-B");
    expect(deps.renderSidenav).toHaveBeenCalledTimes(1);
  });
});

describe("createOrgSwitchController — supersede during navigateToOrgEntryPage", () => {
  beforeEach(() => {
    mockState.handler = null;
    localStorage.clear();
  });

  test("a switch superseded mid-bootstrap does not call openPage for the stale org", async () => {
    // The handler's seq guard at installHandler only protects the
    // fetchProjects-to-render hop. Once navigateToOrgEntryPage takes
    // over, its own awaits (bootstrap, post-bootstrap fetch, openPage)
    // can outlive a newer switch — and without an internal recheck the
    // stale org's openPage clobbers whatever page the newer switch's
    // pipeline (or a concurrent loadPage) just opened.
    const createProjectDeferreds = [];
    const createPageDeferreds = [];
    // Returns A as empty so handler-1 falls into the bootstrap branch
    // (the only branch with awaits before openPage). Returns B with
    // pages so handler-2 finishes normally. The default buildController
    // wires getCachedProjects to echo setCachedProjects, so handler-B's
    // post-fetch write is what nav-B reads — overriding getCachedProjects
    // here would force nav-B into the bootstrap path too and hang the
    // test on an unresolved second deferred.
    let fetchCallCount = 0;
    const { controller, deps } = buildController({
      fetchProjects: vi.fn(async () => {
        fetchCallCount += 1;
        if (fetchCallCount === 1) return []; // A's projects: empty
        return [{ external_id: "proj-B", pages: [{ external_id: "page-B1" }] }];
      }),
      createProjectApi: vi.fn(() => {
        const d = deferred();
        createProjectDeferreds.push(d);
        return d.promise;
      }),
      createPageApi: vi.fn(() => {
        const d = deferred();
        createPageDeferreds.push(d);
        return d.promise;
      }),
    });
    controller.installHandler();
    expect(mockState.handler).toBeTypeOf("function");

    // Start handler for org-A. It will fetchProjects (returning []),
    // pass the handler-level seq guard, then enter navigateToOrgEntryPage
    // and suspend inside bootstrapEmptyOrg awaiting createProjectApi.
    const runA = mockState.handler("org-A");

    // Flush microtasks until A is parked inside the bootstrap. A few
    // ticks are needed: one for fetchProjects, one for the handler to
    // re-enter, one for navigateToOrgEntryPage to reach createProjectApi.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(createProjectDeferreds).toHaveLength(1);

    // While A is parked in bootstrap, fire a newer switch to B. This
    // bumps orgSwitchSeq from 1 to 2.
    const runB = mockState.handler("org-B");
    for (let i = 0; i < 3; i++) await Promise.resolve();
    await runB; // B's pipeline completes normally — opens page-B1.

    // Now resolve A's bootstrap. Its captured seq (1) is stale (2 now),
    // so each recheck inside navigateToOrgEntryPage should bail before
    // touching the sidenav or calling openPage for A.
    createProjectDeferreds[0].resolve({ external_id: "proj-A", pages: [] });
    for (let i = 0; i < 3; i++) await Promise.resolve();
    expect(createPageDeferreds).toHaveLength(1);
    createPageDeferreds[0].resolve({ external_id: "page-A-untitled" });
    await runA;

    // openPage should have fired exactly once, for B's resume target.
    // If the seq recheck were missing, A's bootstrapped page-A-untitled
    // would also openPage and clobber the user's view of page-B1.
    expect(deps.openPage).toHaveBeenCalledTimes(1);
    expect(deps.openPage.mock.calls[0][0]).toBe("page-B1");

    // fetchProjects: handler-A (1) + handler-B (1). The third call inside
    // nav-A's post-bootstrap branch must be skipped by the recheck.
    expect(deps.fetchProjects).toHaveBeenCalledTimes(2);

    // setCachedProjects / renderSidenav: each fires once at the handler
    // level for A (with the empty [] from A's fetch) and once for B.
    // Nav-A's post-bootstrap write would have been a third — that's the
    // one the recheck stops. The final state is B's render, not A's
    // stale post-bootstrap render.
    expect(deps.setCachedProjects).toHaveBeenCalledTimes(2);
    expect(deps.renderSidenav).toHaveBeenCalledTimes(2);
    const lastCachedCall = deps.setCachedProjects.mock.calls.at(-1)[0];
    expect(lastCachedCall[0].external_id).toBe("proj-B");
  });
});

describe("createOrgSwitchController — bootstrap coalescing (orgBootstrapInFlight)", () => {
  beforeEach(() => {
    mockState.handler = null;
    localStorage.clear();
  });

  test("two concurrent bootstraps of the same empty org share one createProject call", async () => {
    // The empty-org bootstrap creates an "Untitled" project+page. Without
    // coalescing, two near-simultaneous switches into the same empty
    // workspace would race and create two Untitled projects. The
    // in-flight Map keyed by orgId is the only thing preventing that.
    const createProjectDeferreds = [];
    const createPageDeferreds = [];
    const { controller, deps } = buildController({
      getCachedProjects: vi.fn(() => []),
      fetchProjects: vi.fn(async () => []),
      createProjectApi: vi.fn(() => {
        const d = deferred();
        createProjectDeferreds.push(d);
        return d.promise;
      }),
      createPageApi: vi.fn(() => {
        const d = deferred();
        createPageDeferreds.push(d);
        return d.promise;
      }),
    });

    const r1 = controller.navigateToOrgEntryPage("org-empty");
    const r2 = controller.navigateToOrgEntryPage("org-empty");

    // Both calls should have hit bootstrapEmptyOrg but only the first
    // should have actually initiated a project creation — the second
    // awaits the first's in-flight promise.
    expect(deps.createProjectApi).toHaveBeenCalledTimes(1);

    createProjectDeferreds[0].resolve({ external_id: "proj-new", pages: [] });
    // The shared promise's continuation kicks off createPageApi exactly
    // once for the same reason. Flush a couple of microtasks so the
    // awaited project-create resolution propagates into the page-create
    // call.
    await Promise.resolve();
    await Promise.resolve();
    expect(deps.createPageApi).toHaveBeenCalledTimes(1);

    createPageDeferreds[0].resolve({ external_id: "page-new" });
    await Promise.all([r1, r2]);

    // After the bootstrap completes, both call sites end up opening the
    // same page (they shared the promise). If coalescing failed each
    // would see its own freshly-created page.
    expect(deps.openPage).toHaveBeenCalled();
    for (const call of deps.openPage.mock.calls) {
      expect(call[0]).toBe("page-new");
    }
  });
});
