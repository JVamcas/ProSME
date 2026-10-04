import { expect, test, type Page } from "playwright/test";

import {
  installResponsivenessSession,
  responsivenessSessionFile as sessionFile,
} from "./helpers/ResponsivenessSession";

test.skip(!sessionFile, "Requires the isolated synthetic performance session.");

async function dashboardLink(page: Page) {
  return page
    .locator('nav[aria-label="Portal navigation"] a[href="/admin"]')
    .filter({ visible: true })
    .first();
}

async function delayDashboardNavigation(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.headers()["next-router-prefetch"]) return route.abort();
    if (url.pathname === "/admin" && request.headers().rsc) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await route.continue();
  });
}

test.beforeEach(async ({ context }) => {
  await installResponsivenessSession(context);
});

test("keyboard navigation announces pending and keeps shell controls usable", async ({
  page,
}) => {
  await delayDashboardNavigation(page);
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  const link = await dashboardLink(page);
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(link.getByRole("status")).toBeVisible();
  await page.screenshot({
    path: "test-results/page-responsiveness-desktop-pending.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Collapse navigation sidebar" })
    .click();
  await expect(
    page.getByRole("button", { name: "Expand navigation sidebar" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(0);
  await page.screenshot({
    path: "test-results/page-responsiveness-desktop.png",
    fullPage: true,
  });
});

test("modified clicks keep the original navigation and pending state unchanged", async ({
  page,
  context,
}) => {
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  const newPagePromise = context.waitForEvent("page");
  await (await dashboardLink(page)).click({ modifiers: ["Control"] });
  const destination = await newPagePromise;
  await destination.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/\/admin\/applications$/);
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(0);
  await destination.close();
});

test("history and successive destinations do not leave a pending link stuck", async ({
  page,
}) => {
  await delayDashboardNavigation(page);
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  await (await dashboardLink(page)).click();
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(1);
  await page
    .locator('nav a[href="/admin/funding-calls"]')
    .filter({ visible: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Funding calls", exact: true }),
  ).toBeVisible();
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(0);
  await page.goBack();
  await page.goForward();
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(0);
});

test("failed route preparation recovers through the router's document fallback", async ({
  page,
}) => {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.headers()["next-router-prefetch"]) return route.abort();
    if (new URL(request.url()).pathname === "/admin" && request.headers().rsc) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  await (await dashboardLink(page)).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.locator('nav [aria-busy="true"]')).toHaveCount(0);
});

test("mobile navigation and page content fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await delayDashboardNavigation(page);
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  await page.getByLabel("Open portal navigation").click();
  const link = await dashboardLink(page);
  await link.click();
  await expect(link.getByRole("status")).toBeVisible();
  await page.screenshot({
    path: "test-results/page-responsiveness-mobile-pending.png",
    fullPage: true,
  });
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  await page.screenshot({
    path: "test-results/page-responsiveness-mobile.png",
    fullPage: true,
  });
});

for (const dashboard of [
  {
    path: "/admin",
    source: "/admin/applications",
    api: "/api/dashboard/staff",
    title: "Dashboard",
    ready: "Total applications",
  },
  {
    path: "/portal",
    source: "/portal/applications",
    api: "/api/dashboard/applicant",
    title: /Welcome back/,
    ready: "My Application",
  },
]) {
  test(`${dashboard.path} renders structure before data, retries and clears denied content`, async ({
    page,
  }) => {
    let responseMode: "slow" | "success" | "failed" | "denied" = "slow";
    let release: (() => void) | undefined;
    const heldResponse = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**${dashboard.api}*`, async (route) => {
      if (responseMode === "slow") await heldResponse;
      if (responseMode === "failed" || responseMode === "denied") {
        await route.fulfill({
          status: responseMode === "denied" ? 403 : 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Synthetic response failure" },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto(dashboard.source, { waitUntil: "networkidle" });
    await page
      .locator(
        `nav[aria-label="Portal navigation"] a[href="${dashboard.path}"]`,
      )
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole("main").getByRole("heading", { name: dashboard.title }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status", { name: "" })
        .filter({ hasText: "Loading dashboard" }),
    ).toBeVisible();
    await expect(page.locator("[data-page-loading] strong")).toHaveCount(0);
    await page.screenshot({
      path: `test-results/dashboard-${dashboard.path.slice(1)}-loading.png`,
      fullPage: true,
    });
    responseMode = "success";
    release!();
    await expect(
      page.getByRole("main").getByText(dashboard.ready, { exact: true }),
    ).toBeVisible();
    responseMode = "failed";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Unable to load dashboard",
    );
    responseMode = "success";
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByRole("main").getByText(dashboard.ready, { exact: true }),
    ).toBeVisible();
    responseMode = "denied";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Unable to load dashboard",
    );
    await expect(
      page.getByRole("main").getByText(dashboard.ready, { exact: true }),
    ).toHaveCount(0);
  });
}

test("staff periods have distinct cache entries and returning uses the current account cache", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/dashboard/staff"))
      requests.push(request.url());
  });
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.getByLabel("Reporting period").selectOption("7");
  await expect(page).toHaveURL(/period=7/);
  await expect(
    page.getByRole("main").getByText("Total applications", { exact: true }),
  ).toBeVisible();
  expect(requests.some((url) => url.endsWith("period=7"))).toBe(true);
  const count = requests.length;
  await page
    .locator('nav a[href="/admin/applications"]')
    .filter({ visible: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Applications", exact: true }),
  ).toBeVisible();
  await (await dashboardLink(page)).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Total applications", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(count);
});
