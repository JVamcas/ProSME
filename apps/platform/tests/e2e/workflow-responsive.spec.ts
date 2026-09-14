import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "playwright/test";

import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import {
  createWorkflowScreenIdentity,
  deleteWorkflowScreenIdentity,
  establishWorkflowScreenSession,
  type ScreenIdentity,
} from "./support/workflow-screen-session";

const enabled = process.env.RUN_P3_WORKFLOW_SCREEN_TESTS === "true";
const definitionId = "51111111-1111-4111-8111-111111111111";
const versionId = "52222222-2222-4222-8222-222222222222";
const correlationId = "53333333-3333-4333-8333-333333333333";
const describeScreen = enabled ? test.describe : test.describe.skip;

function response(route: Route, data: unknown) {
  return route.fulfill({
    contentType: "application/json",
    json: { data, meta: { correlationId } },
    status: 200,
  });
}

async function mockWorkflowQueries(page: Page) {
  await page.route("**/api/admin/workflow-definitions", (route) =>
    response(route, [
      {
        active: true,
        code: "SCREEN_TEST_WORKFLOW",
        description: "Real workflow screen browser test",
        id: definitionId,
        latestStatus: "DRAFT",
        latestVersion: 1,
        name: "Screen test workflow",
        updatedAt: "2026-09-14T00:00:00.000Z",
      },
    ]),
  );
  await page.route("**/api/admin/workflow-definitions/published", (route) =>
    response(route, [
      {
        definitionId,
        name: "Screen test workflow",
        versionId,
        versionNumber: 1,
      },
    ]),
  );
  await page.route("**/api/admin/workflow-assignments", (route) =>
    response(route, [
      {
        assignedAt: "2026-09-14T00:00:00.000Z",
        fundingOpportunityId: 3301,
        fundingOpportunityTitle: "SME Growth Fund",
        rowVersion: 1,
        versionNumber: 1,
        workflowName: "Screen test workflow",
        workflowVersionId: versionId,
      },
    ]),
  );
  await page.route("**/api/admin/workflow-opportunities", (route) =>
    response(route, {
      items: [
        {
          id: 3301,
          slug: "sme-growth-fund",
          title: "SME Growth Fund",
        },
      ],
      nextCursor: null,
      total: 1,
    }),
  );
  await page.route(
    `**/api/admin/workflow-definitions/${definitionId}/draft`,
    (route) =>
      response(route, {
        allowedActions: ["UPDATE", "VALIDATE", "PREVIEW", "PUBLISH"],
        definition: {
          code: "SCREEN_TEST_WORKFLOW",
          description: "Real workflow screen browser test",
          id: definitionId,
          name: "Screen test workflow",
        },
        graph: referenceWorkflow,
        validation: { errors: [], valid: true, warnings: [] },
        version: {
          createdAt: "2026-09-14T00:00:00.000Z",
          id: versionId,
          number: 1,
          publishedAt: null,
          retiredAt: null,
          rowVersion: 1,
          status: "DRAFT",
        },
      }),
  );
}

async function expectAccessibleScreen(page: Page) {
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    results.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
}

describeScreen("real workflow configuration screens", () => {
  test.setTimeout(60_000);
  let identity: ScreenIdentity | undefined;

  test.beforeAll(async () => {
    identity = await createWorkflowScreenIdentity();
  });

  test.afterAll(async () => {
    if (identity) await deleteWorkflowScreenIdentity(identity);
  });

  test("renders definitions, assignment, and editor routes", async ({ page }) => {
    if (!identity) throw new Error("The screen-test identity was not created.");
    await establishWorkflowScreenSession(page, identity);
    await mockWorkflowQueries(page);

    const definitions = await page.goto("/admin/workflows", {
      waitUntil: "networkidle",
    });
    expect(definitions?.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Workflow configuration" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Screen test workflow/ }),
    ).toBeVisible();
    await expectAccessibleScreen(page);

    await page.getByRole("tab", { name: "Opportunity assignment" }).click();
    await expect(
      page.getByRole("heading", { name: "Current assignments" }),
    ).toBeVisible();
    await expect(page.getByText("SME Growth Fund").first()).toBeVisible();
    await expectAccessibleScreen(page);

    await page.getByRole("tab", { name: "Definitions" }).click();
    await page.getByRole("link", { name: /Screen test workflow/ }).click();
    await expect(page).toHaveURL(`/admin/workflows/${definitionId}`);
    await expect(
      page.getByRole("heading", { name: "Screen test workflow" }),
    ).toBeVisible();
    await expect(page.getByText("Outcome communication")).toBeVisible();
    await expectAccessibleScreen(page);

    const publish = page.getByRole("button", { name: "Publish" });
    const box = await publish.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.9);
  });
});
