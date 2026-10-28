/**
 * End-to-end tests for the marketing footer (core/partials/_footer.html).
 *
 * The footer is server-rendered on the public pages, so these tests need no
 * auth and no seeding — just a running stack.
 *
 * Covers:
 * 1. The "Related products" column links to histre.com with a tagline
 * 2. "Learn More" links to the Source Code page
 * 3. Footer columns never overlap at desktop, tablet and mobile widths
 *
 * Run with:
 *   npx playwright test marketing-footer.spec.js
 */

import { test, expect } from "@playwright/test";

const PAGES = ["/", "/about/"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 900, height: 900 },
  { name: "mobile", width: 600, height: 900 },
];

for (const path of PAGES) {
  test(`footer on ${path} links to histre and Source Code`, async ({ page }) => {
    await page.goto(path);
    const footer = page.locator("footer.landing-footer");
    await expect(footer).toBeVisible();

    const histre = footer.locator('a[href="https://histre.com/"]');
    await expect(histre).toHaveCount(1);
    await expect(histre).toContainText("histre");
    await expect(histre.locator(".footer-link-tagline")).toHaveText(
      "A knowledge base that organizes itself"
    );
    await expect(histre).toHaveAttribute("target", "_blank");
    await expect(histre).toHaveAttribute("rel", /noopener/);

    const sourceCode = footer.getByRole("link", { name: "Source Code" });
    await expect(sourceCode).toHaveAttribute("href", "/dev/oss/");
  });
}

for (const vp of VIEWPORTS) {
  test(`footer columns do not overlap at ${vp.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    const footer = page.locator("footer.landing-footer");
    await footer.scrollIntoViewIfNeeded();

    const boxes = await footer.locator(".landing-footer-column").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      })
    );
    expect(boxes.length).toBe(5);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlaps, `columns ${i} and ${j} overlap at ${vp.name}`).toBe(false);
      }
    }
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(vp.width);
    }
    await expect(footer.locator('a[href="https://histre.com/"]')).toBeVisible();
  });
}
