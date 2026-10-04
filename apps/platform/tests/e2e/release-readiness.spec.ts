import { writeFile } from "node:fs/promises";
import { expect, test } from "playwright/test";
import {
  installResponsivenessSession,
  responsivenessApplicationId as id,
  responsivenessSessionFile,
} from "./helpers/ResponsivenessSession";

import {
  installStaffRecordSwitchFixture,
  fulfillSecondStaffProjection,
  secondStaffReference,
} from "./helpers/StaffRecordSwitchFixture";

test.skip(!responsivenessSessionFile, "Requires isolated synthetic sessions.");
test.beforeEach(async ({ context }) => {
  await installResponsivenessSession(context);
});

for (const audience of ["admin", "portal"]) {
  test(`${audience} cached detail return reuses the authorized projection`, async ({
    page,
  }, testInfo) => {
    const primary =
      audience === "admin"
        ? `/api/admin/applications/${id}/detail`
        : `/api/applications/${id}/read-view`;
    let primaryReads = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === primary) primaryReads += 1;
    });
    await page.goto(`/${audience}/applications`, { waitUntil: "networkidle" });
    const link = page
      .locator(`a[href="/${audience}/applications/${id}"]`)
      .filter({ visible: true })
      .first();
    await link.click();
    const overview = page.getByRole("heading", {
      name: "Application overview",
      exact: true,
    });
    await expect(overview).toBeVisible();
    await page
      .locator(`main a[href="/${audience}/applications"]`)
      .first()
      .click();
    await expect(link).toBeVisible();
    const readsBefore = primaryReads;
    const started = performance.now();
    await link.click();
    await expect(overview).toBeVisible();
    const elapsedMs = performance.now() - started;
    await expect(page.locator("[data-page-loading]")).toHaveCount(0);
    expect(primaryReads).toBe(readsBefore);
    await writeFile(
      `/tmp/page-responsiveness/g4-cached-${audience}-${testInfo.repeatEachIndex}.json`,
      JSON.stringify(
        {
          audience,
          sample: testInfo.repeatEachIndex,
          elapsedMs,
          primaryReads,
          returnReads: primaryReads - readsBefore,
          synthetic: true,
        },
        null,
        2,
      ),
    );
  });

  test(`${audience} switching records never displays the previous projection`, async ({
    page,
  }) => {
    const secondId = "66666666-6666-4666-8666-666666666662";
    const primary =
      audience === "admin"
        ? `/api/admin/applications/${secondId}/detail`
        : `/api/applications/${secondId}/read-view`;
    if (audience === "admin")
      await installStaffRecordSwitchFixture(page, secondId);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**${primary}`, async (route) => {
      await held;
      if (audience === "admin") await fulfillSecondStaffProjection(route);
      else await route.continue();
    });
    await page.goto(`/${audience}/applications/${id}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toBeVisible();
    await page
      .locator(`main a[href="/${audience}/applications"]`)
      .first()
      .click();
    await page
      .locator(`a[href="/${audience}/applications/${secondId}"]`)
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.locator("[data-page-loading]")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Withdraw", exact: true }),
    ).toHaveCount(0);
    release();
    await expect(
      page.getByRole("heading", { name: "Application overview", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText(
          audience === "admin" ? secondStaffReference : "Pending submission",
          { exact: true },
        ),
    ).toBeVisible();
  });
}

test("a lost session clears a loaded projection and protected APIs reject it", async ({
  page,
  context,
}) => {
  await page.goto(`/portal/applications/${id}`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toBeVisible();
  await context.clearCookies({ name: "__Host-smefund_session" });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to load application details",
  );
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toHaveCount(0);
  const response = await page.request.get(`/api/applications/${id}/read-view`);
  expect(response.status()).toBe(401);
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
});

test("logout removes the server session and history cannot restore protected data", async ({
  page,
  context,
}) => {
  await page.goto(`/portal/applications/${id}`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Logout", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in/);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "__Host-smefund_session",
    ),
  ).toBe(false);
  expect(
    (await page.request.get(`/api/applications/${id}/read-view`)).status(),
  ).toBe(401);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toHaveCount(0);
});

test("a different authenticated account cannot reuse the prior account's application", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.RESPONSIVENESS_SCOPE_SESSION,
    "Requires second synthetic account.",
  );
  await page.goto(`/portal/applications/${id}`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toBeVisible();
  await installResponsivenessSession(
    context,
    process.env.RESPONSIVENESS_SCOPE_SESSION,
  );
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to load application details",
  );
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get(`/api/applications/${id}/read-view`)).status(),
  ).toBe(404);
  await page.locator('main a[href="/portal/applications"]').first().click();
  await expect(
    page.locator(`a[href="/portal/applications/${id}"]`),
  ).toHaveCount(0);
});
