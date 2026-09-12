import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "playwright/test";

const routes = ["/", "/about", "/funding", "/eligibility", "/how-to-apply", "/news", "/resources", "/events", "/faq", "/contact", "/privacy", "/terms"];

for (const route of routes) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok()).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
}

test("public asset payload stays within the Phase 2 budget", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const bytes = await page.evaluate(() => performance.getEntriesByType("resource").reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0));
  expect(bytes).toBeLessThan(2_500_000);
});
