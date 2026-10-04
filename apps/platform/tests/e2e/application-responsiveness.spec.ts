import { readFile } from "node:fs/promises";
import { expect, test } from "playwright/test";

const sessionFile = process.env.RESPONSIVENESS_SESSION;
const id = "66666666-6666-4666-8666-666666666661";
test.skip(!sessionFile, "Requires the isolated synthetic performance session.");
test.beforeEach(async ({ context }) => {
  const { cookie } = JSON.parse(await readFile(sessionFile!, "utf8"));
  await context.addCookies([
    {
      name: "__Host-smefund_session",
      value: cookie,
      url: (
        process.env.RESPONSIVENESS_BASE_URL ?? "http://localhost:3018"
      ).replace("http:", "https:"),
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
});

for (const audience of ["admin", "portal"]) {
  test(`${audience} detail shows structure before primary data and independently retries requests`, async ({
    page,
  }) => {
    const primary =
      audience === "admin"
        ? `/api/admin/applications/${id}/detail`
        : `/api/applications/${id}/read-view`;
    const requests =
      audience === "admin"
        ? `/api/applications/${id}/information-requests`
        : `/api/portal/applications/${id}/requests`;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let primaryCount = 0;
    let denied = false;
    let secondaryFailed = true;
    await page.route(`**${primary}`, async (route) => {
      primaryCount += 1;
      await held;
      if (denied) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Synthetic access denial" },
          }),
        });
      } else await route.continue();
    });
    await page.route(`**${requests}`, async (route) => {
      if (secondaryFailed)
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Synthetic section failure" },
          }),
        });
      else await route.continue();
    });
    await page.goto(`/${audience}/applications`, { waitUntil: "networkidle" });
    await page
      .locator(`a[href="/${audience}/applications/${id}"]`)
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Application details", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-page-loading]")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Withdraw", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/page-responsiveness/${audience}-detail-loading.png`,
      fullPage: true,
    });
    release();
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toBeVisible();
    expect(primaryCount).toBe(1);
    await page.getByRole("tab", { name: "Requests for information" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Unable to load information requests",
    );
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toBeVisible();
    secondaryFailed = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    denied = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Unable to load application details",
    );
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("tab", { name: "Requests for information" }),
    ).toHaveCount(0);
  });
}

test("workflow progress can fail independently while staff overview remains available", async ({
  page,
}) => {
  let failed = true;
  await page.route(
    `**/api/applications/${id}/workflow-progress*`,
    async (route) => {
      if (failed)
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Synthetic progress failure" },
          }),
        });
      else await route.continue();
    },
  );
  await page.goto(`/admin/applications/${id}?tab=workflow-progress`);
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Workflow progress could not be loaded",
  );
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("unknown records and malformed identifiers show errors without record actions", async ({
  page,
}) => {
  await page.goto("/portal/applications/66666666-6666-4666-8666-666666666699");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to load application details",
  );
  await expect(
    page.getByRole("button", { name: "Withdraw", exact: true }),
  ).toHaveCount(0);
  await page.goto("/portal/applications/invalid-id");
  await expect(
    page.getByRole("heading", { name: "404", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw", exact: true }),
  ).toHaveCount(0);
});

for (const audience of ["admin", "portal"]) {
  test(`${audience} detail fits the mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${audience}/applications/${id}`);
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    await page.screenshot({
      path: `/tmp/page-responsiveness/${audience}-detail-mobile.png`,
      fullPage: true,
    });
  });
}
