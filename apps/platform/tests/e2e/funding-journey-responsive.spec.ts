import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "playwright/test";

import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";

for (const viewport of [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`${viewport.name}: funding and call-specific eligibility remain usable`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const response = await request.get("/api/public/funding-calls", { timeout: 60_000 });
    expect(response.ok()).toBe(true);
    const payload = await response.json() as { data: PublicFundingCallSummary[] };
    const call = payload.data.find((item) => item.selfCheckAvailable && item.status !== "closed");
    test.skip(!call, "Requires a published call with a self-check in the local database.");
    if (!call) return;
    const href = `/how-to-apply/funding/${call.id}`;

    await page.goto("/how-to-apply/funding");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find funding for your next step");
    await expect(page.getByRole("heading", { name: "What the fund supports", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Priority applicants", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/npid-funding-${viewport.name}.png`, fullPage: true });
    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(call.title);
    await page.getByRole("link", { name: "Check eligibility for this call" }).click();
    await expect(page).toHaveURL(new RegExp(`${call.id}/eligibility$`));
    await expect(page.getByRole("region", { name: "Selected funding call" })).toContainText(call.title);

    // Deterministic questionnaire data exercises the actual client form and its ID-based request.
    await page.route(`**/api/public/eligibility-self-checks/${call.id}`, async (route) => {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON().answers).toEqual({ registration: true, location: false });
        await route.fulfill({ json: { data: {
          advisory: true,
          applicationsOpen: true,
          disclaimer: "Formal eligibility is confirmed during screening.",
          fundingCallId: call.id,
          guidance: [],
          outcome: "likely-eligible",
        } } });
        return;
      }
      await route.fulfill({ json: { data: {
        advisory: true,
        configurationToken: "a".repeat(64),
        fundingCall: { applicationsOpen: true, id: call.id, slug: call.slug, title: call.title },
        questions: [
          { id: "registration", label: "Is your business registered in Namibia?" },
          { id: "location", label: "Does your business operate outside Namibia?" },
        ].map((item, index) => ({
          ...item,
          explanation: "",
          helpText: "Choose the answer that applies to your business.",
          options: [],
          order: index,
          progress: { current: index + 1, total: 2 },
          required: true,
          section: null,
          type: "boolean",
        })),
      } } });
    });
    await page.reload();
    await expect(page.getByText("Question 1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Choose or enter an answer to continue.")).toBeVisible();
    await page.getByRole("radio", { name: /Yes/ }).check();
    await page.screenshot({ path: `/tmp/npid-eligibility-${viewport.name}.png`, fullPage: true });
    const violations = (await new AxeBuilder({ page }).include("main").analyze()).violations;
    expect(violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const continueButton = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
    expect(continueButton?.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Question 2 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("radio", { name: /Yes/ })).toBeChecked();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("radio", { name: /No/ }).check();
    await page.getByRole("button", { name: "Check eligibility", exact: true }).click();
    await expect(page.getByRole("heading", { name: "You appear eligible to apply" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start application" })).toHaveAttribute("href", `${href}/apply`);
    await page.getByRole("link", { name: "Start application" }).click();
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(`/portal/applications/new?fundingOpportunityId=${call.id}`).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  });
}
