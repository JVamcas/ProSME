import { expect, test } from "playwright/test";
import {
  installResponsivenessSession,
  responsivenessApplicationId as id,
  responsivenessSessionFile,
} from "./helpers/ResponsivenessSession";

test.skip(
  !responsivenessSessionFile || process.env.RESPONSIVENESS_MUTATIONS !== "true",
  "Run explicitly after measurements against disposable synthetic records.",
);
test.beforeEach(async ({ context }) => {
  await installResponsivenessSession(context);
});

test("deleting a cached draft refreshes the list and the deleted record cannot return", async ({
  page,
}) => {
  const draftId = "66666666-6666-4666-8666-666666666663";
  const fixture = await page.request.get(
    `/api/applications/${draftId}/read-view`,
  );
  expect(fixture.status(), "Requires a freshly prepared synthetic draft").toBe(
    200,
  );
  expect((await fixture.json()).data.summary.status).toBe("draft");
  await page.goto("/portal/applications", { waitUntil: "networkidle" });
  const link = page
    .locator(`a[href="/portal/applications/${draftId}"]`)
    .filter({ visible: true })
    .first();
  await link.click();
  await expect(
    page.getByRole("heading", { name: "Application overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page
    .getByRole("menuitem", { name: "Delete draft", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("This cannot be undone");
  const deleted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/portal/applications/${draftId}` &&
      response.request().method() === "DELETE",
  );
  await dialog
    .getByRole("button", { name: "Delete draft", exact: true })
    .click();
  expect((await deleted).status()).toBe(200);
  await expect(page).toHaveURL(/\/portal\/applications$/);
  await expect(
    page.locator(`a[href="/portal/applications/${draftId}"]`),
  ).toHaveCount(0);
  await page.goto(`/portal/applications/${draftId}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to load application details",
  );
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
});

test("withdrawing a loaded application refreshes its projection and dashboard", async ({
  page,
}) => {
  const fixture = await page.request.get(`/api/applications/${id}/read-view`);
  expect(
    fixture.status(),
    "Requires a freshly prepared submitted fixture",
  ).toBe(200);
  expect((await fixture.json()).data.summary.status).toBe("submitted");
  await page.goto("/portal", { waitUntil: "networkidle" });
  await page
    .locator(
      'nav[aria-label="Portal navigation"] a[href="/portal/applications"]',
    )
    .filter({ visible: true })
    .first()
    .click();
  await page
    .locator(`a[href="/portal/applications/${id}"]`)
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: /^Reason/ })
    .fill("Synthetic release regression withdrawal");
  await dialog.getByRole("checkbox").check();
  const withdrawn = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/portal/applications/${id}/withdraw` &&
      response.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Withdraw application", exact: true })
    .click();
  expect((await withdrawn).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("main").getByText("Withdrawn", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw", exact: true }),
  ).toHaveCount(0);
  let dashboardReads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/dashboard/applicant")
      dashboardReads += 1;
  });
  await page
    .locator('nav[aria-label="Portal navigation"] a[href="/portal"]')
    .filter({ visible: true })
    .first()
    .click();
  await expect(
    page.getByRole("main").getByText("My Application", { exact: true }),
  ).toBeVisible();
  expect(dashboardReads).toBeGreaterThan(0);
  expect(
    (await page.request.get(`/api/applications/${id}/read-view`)).status(),
  ).toBe(200);
});
