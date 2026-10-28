/**
 * Demo content — the workspace of Peregrine Coffee, a small fictional
 * coffee-subscription team. A realistic, cross-linked workspace shows the
 * product better than tutorial pages: backlinks are real (demoApi computes
 * them from this content), tasks are mid-flight, and the Discuss threads
 * sit on a draft spec where AI review makes sense.
 *
 * Invariants:
 * - Page ids must keep the `demo-` prefix (route detection in spa()).
 * - DEMO_COMMENTS anchor_text must be an EXACT substring of the page
 *   content, or highlight resolution fails silently.
 */

const HOUR = 3600000;
const DAY = 24 * HOUR;

function ts(msAgo) {
  return new Date(Date.now() - msAgo).toISOString();
}

const START_HERE_CONTENT = `You're looking at the workspace of Peregrine Coffee — a small (fictional) coffee-subscription team. Everything is editable: click anywhere and type. Edits stay in this browser and aren't saved to an account.

## Poke around
- [Subscription Revamp — Spec](/pages/demo-spec/) : a draft spec under review. Open the **Discuss** tab on the right to see the team and the AI reviewers weigh in.
- [Postmortem: Drop-Day Outage](/pages/demo-postmortem/) : an incident writeup, with the [storefront logs](/pages/demo-weblogs/) as evidence
- [Ethiopia Gera Launch Checklist](/pages/demo-launch/) : a task list mid-flight
- [Supplier Contacts](/pages/demo-suppliers/) : a CSV that renders as a table
- [Stress Test — 50k Lines](/pages/demo-stress/) : a ~5 MB page that opens instantly

## Three things to try
1. **Fold a section** : click the arrow in the gutter next to any heading
2. **See backlinks** : open the spec, then the **Ref** tab in the right sidebar
3. **Start a discussion** : select any text and press **Cmd/Ctrl+Alt+M**

## Make it yours
[Sign up free](/signup/) to get a workspace of your own: real-time collaboration, AI reviewers, page history, and a full API.
`;

const SPEC_CONTENT = `Owner: Maya · Status: Draft — under review · Target: April 7

Month-2 and month-3 subscribers churn at twice the rate of everyone else. This spec proposes replacing the fixed monthly plan with flexible cadence and a real pause button.

## Problem
- 38% of cancellations cite "too much coffee piling up"
- Support handles ~30 "skip my next box" requests a month, all manually
- Trade and Atlas both ship cadence controls; we lose comparison shoppers

## Proposal
1. **Cadence picker** : 1, 2, 3, or 4 weeks between boxes
2. **One-click pause** : up to 2 months, from the account page
3. **Vacation hold** : set a date range, boxes resume automatically

## Out of scope
- Gift subscriptions (parked in the [2026 Roadmap](/pages/demo-roadmap/))
- Point-of-sale integration

## Open questions
- [ ] Do we prorate when someone switches cadence mid-cycle?
- [x] Can fulfillment handle variable cadence? Jonas confirmed the WMS supports it
- [ ] Does the intro discount need a minimum commitment?

## Rollout
- [ ] Feature-flag to 10% of subscribers
- [ ] Watch pause adoption and skip-rate for two weeks
- [ ] Full rollout with the announcement email (Sam drafting)

Decisions recorded in [Weekly Sync — Notes](/pages/demo-sync/). Launch-day logistics live in the [Ethiopia Gera Launch Checklist](/pages/demo-launch/).
`;

const ROADMAP_CONTENT = `One line per bet. Details live in linked specs — this page stays short on purpose.

## Now
- [Subscription Revamp — Spec](/pages/demo-spec/) : cadence picker + pause
- Post-outage hardening : action items in the [postmortem](/pages/demo-postmortem/)

## Next
- Gift subscriptions
- Referral program (Sam)

## Later
- Wholesale portal for cafés
- Roastery tour bookings

## Principles
- One launch at a time
- Retention before acquisition
- Boring tech, exciting coffee
`;

const SYNC_CONTENT = `Running notes from the Monday sync. Newest on top.

## March 16
**Attendees:** Maya, Jonas, Priya, Sam

**Decisions**
- Ship the [Subscription Revamp](/pages/demo-spec/) behind a feature flag by April 7
- Referral program moves to Q2 (see [2026 Roadmap](/pages/demo-roadmap/))

**Action items**
- [ ] @[priya](@demo-member-priya) : cadence-picker UI by Friday
- [ ] @[jonas](@demo-member-jonas) : confirm WMS variable-cadence config in staging
- [x] @[sam](@demo-member-sam) : churn-survey summary (done — numbers are in the spec)
- [ ] @[maya](@demo-member-maya) : decide intro-discount minimum commitment

## March 9
**Attendees:** Maya, Jonas, Priya

**Decisions**
- Run the [Ethiopia Gera launch](/pages/demo-launch/) on March 14 as planned
- Add a status page — fallout from the [drop-day outage](/pages/demo-postmortem/)

**Action items**
- [x] Priya : publish the postmortem
- [x] Jonas : re-run the failed shipping labels
`;

const POSTMORTEM_CONTENT = `**Impact:** The storefront returned errors for 23 minutes during the Ethiopia Gera drop (March 14, 10:02–10:25 PT). Roughly 180 checkouts failed and support took 42 tickets.

## Timeline
- 10:00 : drop email goes out to 12,400 subscribers
- 10:02 : error rate climbs, checkout p95 hits 9 seconds
- 10:06 : Priya pages Jonas; traffic is 14× baseline
- 10:11 : root cause identified in the [storefront logs](/pages/demo-weblogs/)
- 10:18 : rate cache deployed to production
- 10:25 : error rate back to baseline

## Root cause
Every checkout recomputed shipping rates against the carrier API with no cache and no timeout. The drop spike exhausted the connection pool, requests queued, and the storefront fell over.

## What went well
- Alerting fired within two minutes
- The drop email had no hard deadline, so we quietly extended the window

## Action items
- [x] Cache carrier rates for 10 minutes (Priya)
- [x] Add a 2-second timeout with a flat-rate fallback (Priya)
- [ ] Load-test the next drop at 20× baseline (Jonas)
- [ ] Status page (decided in [Weekly Sync — Notes](/pages/demo-sync/))
`;

const LAUNCH_CONTENT = `Launch plan for the Ethiopia Gera single-origin drop. Owner: Jonas.

## Pre-launch
- [x] Cupping notes finalized (Maya)
- [x] 340 kg landed at the roastery
- [x] Product photos and page copy (Sam)
- [x] Drop email drafted and scheduled
- [ ] Load-test the storefront — added after the [drop-day outage](/pages/demo-postmortem/)

## Launch day — March 14
- [x] Roast batches 1–4
- [x] Send the drop email at 10:00 PT
- [x] Monitor checkout and the support queue
- [ ] Post-drop debrief

## Follow-ups
- [ ] Restock decision by March 21, based on sell-through
- [ ] Reorder green coffee — details in [Supplier Contacts](/pages/demo-suppliers/)
- [ ] Fold learnings into the [Subscription Revamp — Spec](/pages/demo-spec/)
`;

const SUPPLIERS_CSV = `Supplier,Origin,Varietal,Process,Price per kg,Status
Gera Estate,Ethiopia,Heirloom,Washed,$14.20,Active
Finca La Soledad,Guatemala,Caturra,Washed,$11.80,Active
Fazenda Santa Ines,Brazil,Yellow Bourbon,Natural,$9.40,Active
Kii Cooperative,Kenya,SL28,Washed,$13.60,Active
Long Miles,Burundi,Red Bourbon,Washed,$12.10,Sampling
La Palma y El Tucan,Colombia,Sidra,Honey,$18.90,Sampling
Hacienda La Esmeralda,Panama,Gesha,Natural,$74.00,Wishlist`;

const WEBLOGS_CONTENT = `203.0.113.7 - - [14/Mar/2026:10:01:12 -0700] "POST /api/checkout HTTP/2.0" 200 412 0.31
198.51.100.23 - - [14/Mar/2026:10:01:58 -0700] "POST /api/shipping/rates HTTP/2.0" 200 236 1.94
203.0.113.9 - - [14/Mar/2026:10:02:03 -0700] "POST /api/checkout HTTP/2.0" 200 414 2.88
198.51.100.14 - - [14/Mar/2026:10:02:41 -0700] "POST /api/shipping/rates HTTP/2.0" 200 236 7.02
203.0.113.40 - - [14/Mar/2026:10:03:15 -0700] "POST /api/checkout HTTP/2.0" 504 0 10.00
198.51.100.77 - - [14/Mar/2026:10:03:16 -0700] "POST /api/checkout HTTP/2.0" 504 0 10.00
203.0.113.12 - - [14/Mar/2026:10:04:02 -0700] "POST /api/shipping/rates HTTP/2.0" 504 0 10.00
198.51.100.31 - - [14/Mar/2026:10:05:47 -0700] "POST /api/checkout HTTP/2.0" 504 0 10.00
203.0.113.55 - - [14/Mar/2026:10:08:19 -0700] "GET /api/status HTTP/2.0" 200 48 0.02
198.51.100.14 - - [14/Mar/2026:10:11:33 -0700] "POST /api/checkout HTTP/2.0" 504 0 10.00
203.0.113.21 - - [14/Mar/2026:10:18:04 -0700] "POST /api/shipping/rates HTTP/2.0" 200 236 0.09
203.0.113.83 - - [14/Mar/2026:10:19:26 -0700] "POST /api/checkout HTTP/2.0" 200 415 0.27
198.51.100.60 - - [14/Mar/2026:10:25:01 -0700] "POST /api/checkout HTTP/2.0" 200 412 0.22`;

// Fictional teammates (comment authors)
const MAYA = {
  external_id: "demo-member-maya",
  email: "maya@peregrine.example",
  display_name: "Maya",
};
const JONAS = {
  external_id: "demo-member-jonas",
  email: "jonas@peregrine.example",
  display_name: "Jonas",
};
const YOU = { external_id: "demo-user", email: "demo@example.com", display_name: "You" };

/**
 * Org members for @-mention autocomplete in demo mode.
 * external_ids match the mention syntax used in page content above.
 */
export const DEMO_MEMBERS = [
  { external_id: "demo-member-maya", username: "maya" },
  { external_id: "demo-member-jonas", username: "jonas" },
  { external_id: "demo-member-priya", username: "priya" },
  { external_id: "demo-member-sam", username: "sam" },
];

/**
 * Demo projects structure matching the API response format
 */
export const DEMO_PROJECTS = [
  {
    external_id: "demo-project",
    name: "Peregrine Coffee",
    description: "Team workspace for the Peregrine crew",
    org: {
      external_id: "demo-org",
      name: "Peregrine",
    },
    folders: [
      { external_id: "demo-folder-product", parent_id: null, name: "Product" },
      { external_id: "demo-folder-ops", parent_id: null, name: "Operations" },
      { external_id: "demo-folder-data", parent_id: null, name: "Data" },
    ],
    pages: [
      {
        external_id: "demo-start-here",
        title: "Start Here",
        created: ts(30 * DAY),
        modified: ts(3 * DAY),
      },
      {
        external_id: "demo-spec",
        title: "Subscription Revamp — Spec",
        folder_id: "demo-folder-product",
        created: ts(12 * DAY),
        modified: ts(4 * HOUR),
      },
      {
        external_id: "demo-roadmap",
        title: "2026 Roadmap",
        folder_id: "demo-folder-product",
        created: ts(25 * DAY),
        modified: ts(2 * DAY),
      },
      {
        external_id: "demo-sync",
        title: "Weekly Sync — Notes",
        folder_id: "demo-folder-ops",
        created: ts(28 * DAY),
        modified: ts(1 * DAY),
      },
      {
        external_id: "demo-postmortem",
        title: "Postmortem: Drop-Day Outage",
        folder_id: "demo-folder-ops",
        created: ts(9 * DAY),
        modified: ts(5 * DAY),
      },
      {
        external_id: "demo-launch",
        title: "Ethiopia Gera Launch Checklist",
        folder_id: "demo-folder-ops",
        created: ts(20 * DAY),
        modified: ts(6 * DAY),
      },
      {
        external_id: "demo-suppliers",
        title: "Supplier Contacts",
        filetype: "csv",
        folder_id: "demo-folder-data",
        created: ts(60 * DAY),
        modified: ts(8 * DAY),
      },
      {
        external_id: "demo-weblogs",
        title: "Storefront Logs — Mar 14",
        filetype: "log",
        folder_id: "demo-folder-data",
        created: ts(9 * DAY),
        modified: ts(9 * DAY),
      },
      {
        external_id: "demo-stress",
        title: "Stress Test — 50k Lines",
        folder_id: "demo-folder-data",
        created: ts(15 * DAY),
        modified: ts(15 * DAY),
      },
    ],
  },
];

function makePage(externalId, title, content, filetype, createdAgo, modifiedAgo) {
  return {
    external_id: externalId,
    title,
    details: { content, filetype },
    filetype,
    created: ts(createdAgo),
    modified: ts(modifiedAgo),
    updated: ts(modifiedAgo),
    is_owner: true,
    role: "admin",
    project_id: "demo-project",
  };
}

/**
 * Demo page content by external_id
 */
export const DEMO_PAGES = {
  "demo-start-here": makePage(
    "demo-start-here",
    "Start Here",
    START_HERE_CONTENT,
    "md",
    30 * DAY,
    3 * DAY
  ),
  "demo-spec": makePage(
    "demo-spec",
    "Subscription Revamp — Spec",
    SPEC_CONTENT,
    "md",
    12 * DAY,
    4 * HOUR
  ),
  "demo-roadmap": makePage(
    "demo-roadmap",
    "2026 Roadmap",
    ROADMAP_CONTENT,
    "md",
    25 * DAY,
    2 * DAY
  ),
  "demo-sync": makePage("demo-sync", "Weekly Sync — Notes", SYNC_CONTENT, "md", 28 * DAY, 1 * DAY),
  "demo-postmortem": makePage(
    "demo-postmortem",
    "Postmortem: Drop-Day Outage",
    POSTMORTEM_CONTENT,
    "md",
    9 * DAY,
    5 * DAY
  ),
  "demo-launch": makePage(
    "demo-launch",
    "Ethiopia Gera Launch Checklist",
    LAUNCH_CONTENT,
    "md",
    20 * DAY,
    6 * DAY
  ),
  "demo-suppliers": makePage(
    "demo-suppliers",
    "Supplier Contacts",
    SUPPLIERS_CSV,
    "csv",
    60 * DAY,
    8 * DAY
  ),
  "demo-weblogs": makePage(
    "demo-weblogs",
    "Storefront Logs — Mar 14",
    WEBLOGS_CONTENT,
    "log",
    9 * DAY,
    9 * DAY
  ),
};

/**
 * Demo comments keyed by page external_id.
 * The spec page carries the showcase threads: one human discussion and two
 * AI persona reviews. The postmortem gets a Dewey references comment.
 */
export const DEMO_COMMENTS = {
  "demo-spec": [
    {
      external_id: "demo-cmt-pause",
      parent_id: null,
      author: JONAS,
      ai_persona: "",
      requester: null,
      body: "Two months is a long time to forecast inventory around. Could we launch with one month and extend later?",
      anchor_from_b64: null,
      anchor_to_b64: null,
      anchor_text: "**One-click pause** : up to 2 months, from the account page",
      created: ts(2 * DAY),
      modified: ts(2 * DAY),
      replies: [
        {
          external_id: "demo-cmt-pause-r1",
          parent_id: "demo-cmt-pause",
          author: MAYA,
          ai_persona: "",
          requester: null,
          body: "Support data says most pause requests are 2–6 weeks. Let's ship 2 months but track how long people actually pause.",
          anchor_from_b64: null,
          anchor_to_b64: null,
          anchor_text: "",
          created: ts(2 * DAY - 3 * HOUR),
          modified: ts(2 * DAY - 3 * HOUR),
          replies: [],
        },
      ],
    },
    {
      external_id: "demo-cmt-socrates",
      parent_id: null,
      author: null,
      ai_persona: "socrates",
      requester: YOU,
      body: "You cite the 38% who mention surplus coffee. What do the other 62% say? If most churn has a different cause, will cadence controls move the number you care about?",
      anchor_from_b64: null,
      anchor_to_b64: null,
      anchor_text: '38% of cancellations cite "too much coffee piling up"',
      created: ts(1 * DAY),
      modified: ts(1 * DAY),
      replies: [
        {
          external_id: "demo-cmt-socrates-r1",
          parent_id: "demo-cmt-socrates",
          author: YOU,
          ai_persona: "",
          requester: null,
          body: "Fair question — Sam's survey has the breakdown. Adding a summary to the spec.",
          anchor_from_b64: null,
          anchor_to_b64: null,
          anchor_text: "",
          created: ts(22 * HOUR),
          modified: ts(22 * HOUR),
          replies: [],
        },
      ],
    },
    {
      external_id: "demo-cmt-athena",
      parent_id: null,
      author: null,
      ai_persona: "athena",
      requester: YOU,
      body: '"Watch for two weeks" is not a rollout gate. **Set thresholds on the leading metrics before you flip the flag** — e.g. pause adoption above 15% or skip-rate doubling triggers a review. Decide now, while nobody is anxious about the numbers.',
      anchor_from_b64: null,
      anchor_to_b64: null,
      anchor_text: "- [ ] Watch pause adoption and skip-rate for two weeks",
      created: ts(20 * HOUR),
      modified: ts(20 * HOUR),
      replies: [],
    },
  ],
  "demo-postmortem": [
    {
      external_id: "demo-cmt-dewey",
      parent_id: null,
      author: null,
      ai_persona: "dewey",
      requester: YOU,
      body: "Classic missing-bulkhead failure. See [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/) on timeouts, bulkheads, and circuit breakers — the flat-rate fallback you shipped is a textbook graceful-degradation move.",
      anchor_from_b64: null,
      anchor_to_b64: null,
      anchor_text:
        "Every checkout recomputed shipping rates against the carrier API with no cache and no timeout.",
      created: ts(5 * DAY),
      modified: ts(5 * DAY),
      replies: [],
    },
  ],
};

// --- Rewind history (demo-spec) ---
// Four snapshots of the spec evolving from rough notes to the current draft.
// The newest entry's content MUST equal SPEC_CONTENT so "latest version"
// matches the seed editor content. Entries are ordered newest-first, matching
// the real API (desc by rewind_number).
//
// Note: this is fixed seed content — Rewind does NOT reflect a visitor's local
// edits to the spec. So after the spec is edited in the browser, the newest
// Rewind entry can differ from the editor. This is intentional: wiring Rewind
// to effective (edited) content adds complexity for little demo value.

const SPEC_V1 = `Owner: Maya · Status: Early draft

Rough notes — we keep hearing "too much coffee" in cancellation reasons. Can we fix churn with flexible delivery?

## Problem
- Month-2/3 churn is our worst segment
- Support does skip-a-box by hand

## Ideas
- Let people change delivery frequency
- Some kind of pause button
`;

const SPEC_V2 = `Owner: Maya · Status: Draft

Month-2 and month-3 subscribers churn at twice the rate of everyone else. Proposal: replace the fixed monthly plan with flexible cadence and a pause.

## Problem
- 38% of cancellations cite "too much coffee piling up"
- Support handles ~30 "skip my next box" requests a month, all manually

## Proposal
1. **Cadence picker** : 1, 2, 3, or 4 weeks between boxes
2. **Pause** : up to 2 months

## Open questions
- [ ] Do we prorate when someone switches cadence mid-cycle?
- [ ] Can fulfillment handle variable cadence?
`;

const SPEC_V3 = `Owner: Maya · Status: Draft — under review

Month-2 and month-3 subscribers churn at twice the rate of everyone else. This spec proposes replacing the fixed monthly plan with flexible cadence and a real pause button.

## Problem
- 38% of cancellations cite "too much coffee piling up"
- Support handles ~30 "skip my next box" requests a month, all manually
- Trade and Atlas both ship cadence controls; we lose comparison shoppers

## Proposal
1. **Cadence picker** : 1, 2, 3, or 4 weeks between boxes
2. **One-click pause** : up to 2 months, from the account page
3. **Vacation hold** : set a date range, boxes resume automatically

## Out of scope
- Gift subscriptions (parked in the [2026 Roadmap](/pages/demo-roadmap/))
- Point-of-sale integration

## Open questions
- [ ] Do we prorate when someone switches cadence mid-cycle?
- [x] Can fulfillment handle variable cadence? Jonas confirmed the WMS supports it
- [ ] Does the intro discount need a minimum commitment?
`;

export const DEMO_REWINDS = {
  "demo-spec": [
    {
      external_id: "demo-rw-4",
      rewind_number: 4,
      title: "Subscription Revamp — Spec",
      content: SPEC_CONTENT,
      content_size_bytes: SPEC_CONTENT.length,
      editors: ["Maya"],
      label: "",
      lines_added: 9,
      lines_deleted: 1,
      is_compacted: false,
      compacted_from_count: null,
      created: ts(4 * HOUR),
    },
    {
      external_id: "demo-rw-3",
      rewind_number: 3,
      title: "Subscription Revamp — Spec",
      content: SPEC_V3,
      content_size_bytes: SPEC_V3.length,
      editors: ["Maya", "Jonas"],
      label: "Fulfillment confirmed",
      lines_added: 15,
      lines_deleted: 4,
      is_compacted: false,
      compacted_from_count: null,
      created: ts(2 * DAY),
    },
    {
      external_id: "demo-rw-2",
      rewind_number: 2,
      title: "Subscription Revamp — Spec",
      content: SPEC_V2,
      content_size_bytes: SPEC_V2.length,
      editors: ["Maya", "Sam"],
      label: "After churn survey",
      lines_added: 12,
      lines_deleted: 6,
      is_compacted: false,
      compacted_from_count: null,
      created: ts(8 * DAY),
    },
    {
      external_id: "demo-rw-1",
      rewind_number: 1,
      title: "Subscription Revamp — Spec",
      content: SPEC_V1,
      content_size_bytes: SPEC_V1.length,
      editors: ["Maya"],
      label: "",
      lines_added: 14,
      lines_deleted: 0,
      is_compacted: false,
      compacted_from_count: null,
      created: ts(12 * DAY),
    },
  ],
};

// --- Stress test page (generated) ---
// Proves the fast-at-scale claim: ~52,000 lines / ~5 MB, generated
// client-side on first open and cached. Deliberately over LARGE_FILE_BYTES
// so the editor's large-doc mode kicks in. Kept OUT of DEMO_PAGES so
// backlink scans never regex a multi-megabyte string; getDemoPage
// special-cases it instead.

export const STRESS_PAGE_ID = "demo-stress";

function generateStressContent() {
  const parts = [
    `This page is generated in your browser to make a point. It's roughly 52,000 lines (~5 MB) — and it opened instantly.

Try it:
- Scroll anywhere — no jank
- Press Cmd/Ctrl+End to jump to the last line
- Click into the text and type

Most workspace tools give up long before a document gets this big. For very large pages the editor switches to a reduced mode (no syntax highlighting or folding) to stay instant.
`,
  ];
  const topics = ["Roast log", "Order batch", "Support ticket", "Cupping notes", "Delivery run"];
  for (let i = 1; i <= 2000; i++) {
    parts.push(`\n## ${topics[i % topics.length]} #${i}\n\n`);
    for (let j = 1; j <= 24; j++) {
      parts.push(
        `Entry ${i}, line ${j}: routine notes on batch quality, timing, and follow-ups — nothing exciting, just volume.\n`
      );
    }
  }
  return parts.join("");
}

let stressPageCache = null;

function getStressPage() {
  if (!stressPageCache) {
    stressPageCache = makePage(
      STRESS_PAGE_ID,
      "Stress Test — 50k Lines",
      generateStressContent(),
      "md",
      15 * DAY,
      15 * DAY
    );
  }
  return stressPageCache;
}

/**
 * Get a demo page by external_id
 */
export function getDemoPage(externalId) {
  if (externalId === STRESS_PAGE_ID) return getStressPage();
  return DEMO_PAGES[externalId] || null;
}

/**
 * Get the default demo page to show on first load
 */
export function getDefaultDemoPageId() {
  return "demo-start-here";
}
