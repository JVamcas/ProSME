# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: funding-journey-responsive.spec.ts >> desktop: funding and call-specific eligibility remain usable
- Location: tests/e2e/funding-journey-responsive.spec.ts:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Question 1 of 2', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Question 1 of 2', { exact: true }) with timeout 5000ms
  - waiting for getByText('Question 1 of 2', { exact: true })

```

```yaml
- banner:
  - paragraph: An initiative under the ProSME Project|A partnership for a more competitive and inclusive Namibia
  - img "Republic of Namibia"
  - img "GIZ"
  - img "NIPDB"
  - img "ProSME"
  - link "SME Fund home":
    - /url: /
    - img "SME Fund"
  - link "Sign in":
    - /url: /sign-in
  - link "Apply Now":
    - /url: /portal/applications/new
  - navigation "Primary navigation":
    - link "Home":
      - /url: /
    - link "About":
      - /url: /about
    - link "Funding":
      - /url: /funding
    - link "Eligibility":
      - /url: /eligibility
    - link "How to Apply":
      - /url: /how-to-apply
    - link "News":
      - /url: /news
    - link "Resources":
      - /url: /resources
    - link "Events":
      - /url: /events
    - link "FAQs":
      - /url: /faq
    - link "Contact":
      - /url: /contact
- main:
  - navigation "How to Apply":
    - link "Application guide":
      - /url: /how-to-apply
    - link "Funding calls":
      - /url: /how-to-apply/funding
    - link "Check eligibility":
      - /url: /how-to-apply/eligibility
  - navigation "Breadcrumb":
    - list "Breadcrumbs":
      - listitem:
        - link "How to Apply":
          - /url: /how-to-apply
      - listitem:
        - text: /
        - link "First Call for Applications":
          - /url: /how-to-apply/funding/7a2e27a3-a33d-4c7c-94bc-32d595da65f4
      - listitem: / Eligibility
  - heading "Check eligibility" [level=1]
  - paragraph: Answer a few quick questions to see if this call is a good fit for your business.
  - list "Application journey":
    - listitem: Choose a call (complete)
    - listitem: 2 Check eligibility
    - listitem: 3 Apply
  - region "Selected funding call":
    - paragraph: You are checking
    - heading "First Call for Applications" [level=2]
    - text: Applications open
    - link "Back to call details":
      - /url: /how-to-apply/funding/7a2e27a3-a33d-4c7c-94bc-32d595da65f4
  - status:
    - paragraph: Loading eligibility check
    - paragraph: The current questions are being prepared.
  - complementary:
    - paragraph: This self-check is guidance. Formal eligibility is verified during application review.
- contentinfo:
  - img "SME Fund"
  - paragraph: Funding today. A stronger tomorrow.
  - paragraph: Supporting Namibian MSMEs to grow, compete and create opportunities.
  - heading "Explore" [level=2]
  - navigation "Explore links":
    - link "About":
      - /url: /about
    - link "Funding":
      - /url: /funding
    - link "Eligibility":
      - /url: /eligibility
    - link "How to apply":
      - /url: /how-to-apply
    - link "News":
      - /url: /news
    - link "Resources":
      - /url: /resources
  - heading "Support" [level=2]
  - navigation "Support links":
    - link "FAQs":
      - /url: /faq
    - link "Contact Us":
      - /url: /contact
    - link "Track application":
      - /url: /portal
    - link "Terms and conditions":
      - /url: /terms
    - link "Privacy policy":
      - /url: /privacy
  - heading "Stay in the loop" [level=2]
  - paragraph: Get funding-call updates and approved business resources.
  - text: Email address
  - textbox "Email address":
    - /placeholder: Your email address
  - button "Subscribe"
  - checkbox "I agree to receive SME Fund updates and accept the privacy policy."
  - text: I agree to receive SME Fund updates and accept the
  - link "privacy policy":
    - /url: /privacy
  - text: .
  - status
  - paragraph: © 2026 SME Fund Namibia. All rights reserved.
  - link "info@smefund.na":
    - /url: mailto:info@smefund.na
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import AxeBuilder from "@axe-core/playwright";
  2  | import { expect, test } from "playwright/test";
  3  | 
  4  | import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
  5  | 
  6  | for (const viewport of [
  7  |   { name: "phone", width: 375, height: 812 },
  8  |   { name: "tablet", width: 768, height: 1024 },
  9  |   { name: "desktop", width: 1440, height: 1000 },
  10 | ]) {
  11 |   test(`${viewport.name}: funding and call-specific eligibility remain usable`, async ({ page, request }) => {
  12 |     test.setTimeout(120_000);
  13 |     await page.setViewportSize(viewport);
  14 |     const response = await request.get("/api/public/funding-calls", { timeout: 60_000 });
  15 |     expect(response.ok()).toBe(true);
  16 |     const payload = await response.json() as { data: PublicFundingCallSummary[] };
  17 |     const call = payload.data.find((item) => item.selfCheckAvailable && item.status !== "closed");
  18 |     test.skip(!call, "Requires a published call with a self-check in the local database.");
  19 |     if (!call) return;
  20 |     const href = `/how-to-apply/funding/${call.id}`;
  21 | 
  22 |     await page.goto("/how-to-apply/funding");
  23 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find funding for your next step");
  24 |     await expect(page.getByRole("heading", { name: "What the fund supports", exact: true })).toBeVisible();
  25 |     await expect(page.getByRole("heading", { name: "Priority applicants", exact: true })).toBeVisible();
  26 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  27 |     await page.screenshot({ path: `/tmp/npid-funding-${viewport.name}.png`, fullPage: true });
  28 |     await page.locator(`a[href="${href}"]`).first().click();
  29 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(call.title);
  30 |     await page.getByRole("link", { name: "Check eligibility for this call" }).click();
  31 |     await expect(page).toHaveURL(new RegExp(`${call.id}/eligibility$`));
  32 |     await expect(page.getByRole("region", { name: "Selected funding call" })).toContainText(call.title);
  33 | 
  34 |     // Deterministic questionnaire data exercises the actual client form and its ID-based request.
  35 |     await page.route(`**/api/public/eligibility-self-checks/${call.id}`, async (route) => {
  36 |       if (route.request().method() === "POST") {
  37 |         expect(route.request().postDataJSON().answers).toEqual({ registration: true, location: false });
  38 |         await route.fulfill({ json: { data: {
  39 |           advisory: true,
  40 |           applicationsOpen: true,
  41 |           disclaimer: "Formal eligibility is confirmed during screening.",
  42 |           fundingCallId: call.id,
  43 |           guidance: [],
  44 |           outcome: "likely-eligible",
  45 |         } } });
  46 |         return;
  47 |       }
  48 |       await route.fulfill({ json: { data: {
  49 |         advisory: true,
  50 |         configurationToken: "a".repeat(64),
  51 |         fundingCall: { applicationsOpen: true, id: call.id, slug: call.slug, title: call.title },
  52 |         questions: [
  53 |           { id: "registration", label: "Is your business registered in Namibia?" },
  54 |           { id: "location", label: "Does your business operate outside Namibia?" },
  55 |         ].map((item, index) => ({
  56 |           ...item,
  57 |           explanation: "",
  58 |           helpText: "Choose the answer that applies to your business.",
  59 |           options: [],
  60 |           order: index,
  61 |           progress: { current: index + 1, total: 2 },
  62 |           required: true,
  63 |           section: null,
  64 |           type: "boolean",
  65 |         })),
  66 |       } } });
  67 |     });
  68 |     await page.reload();
> 69 |     await expect(page.getByText("Question 1 of 2", { exact: true })).toBeVisible();
     |                                                                      ^ Error: expect(locator).toBeVisible() failed
  70 |     await page.getByRole("button", { name: "Continue", exact: true }).click();
  71 |     await expect(page.getByText("Choose or enter an answer to continue.")).toBeVisible();
  72 |     await page.getByRole("radio", { name: /Yes/ }).check();
  73 |     await page.screenshot({ path: `/tmp/npid-eligibility-${viewport.name}.png`, fullPage: true });
  74 |     const violations = (await new AxeBuilder({ page }).include("main").analyze()).violations;
  75 |     expect(violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  76 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  77 |     const continueButton = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
  78 |     expect(continueButton?.height).toBeGreaterThanOrEqual(44);
  79 |     await page.getByRole("button", { name: "Continue", exact: true }).click();
  80 |     await expect(page.getByText("Question 2 of 2", { exact: true })).toBeVisible();
  81 |     await page.getByRole("button", { name: "Back", exact: true }).click();
  82 |     await expect(page.getByRole("radio", { name: /Yes/ })).toBeChecked();
  83 |     await page.getByRole("button", { name: "Continue", exact: true }).click();
  84 |     await page.getByRole("radio", { name: /No/ }).check();
  85 |     await page.getByRole("button", { name: "Check eligibility", exact: true }).click();
  86 |     await expect(page.getByRole("heading", { name: "You appear eligible to apply" })).toBeVisible();
  87 |     await expect(page.getByRole("link", { name: "Start application" })).toHaveAttribute("href", `${href}/apply`);
  88 |     await page.getByRole("link", { name: "Start application" }).click();
  89 |     await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(`/portal/applications/new?fundingOpportunityId=${call.id}`).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  90 |   });
  91 | }
  92 | 
```