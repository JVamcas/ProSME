import type { Page, Route } from "playwright/test";
import { responsivenessApplicationId } from "./ResponsivenessSession";

export const secondStaffReference = "PERF-RELEASE-SECOND";

// The database has one lodged record and two drafts. Staff lists intentionally
// exclude drafts; add a second synthetic projection only for browser cache isolation.
export async function installStaffRecordSwitchFixture(
  page: Page,
  secondId: string,
) {
  await page.route("**/api/admin/applications?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const first = body.data[0];
    if (!first) throw new Error("The synthetic lodged fixture is missing.");
    await route.fulfill({
      response,
      json: {
        ...body,
        data: [
          ...body.data,
          {
            ...first,
            applicationId: secondId,
            reference: secondStaffReference,
          },
        ],
      },
    });
  });
}

export async function fulfillSecondStaffProjection(route: Route) {
  const response = await route.fetch({
    url: route
      .request()
      .url()
      .replace(
        /\/applications\/[^/]+\/detail/,
        `/applications/${responsivenessApplicationId}/detail`,
      ),
  });
  const body = await response.json();
  await route.fulfill({
    response,
    json: {
      ...body,
      data: {
        ...body.data,
        title: "Second synthetic lodged application",
        reference: secondStaffReference,
        facts: body.data.facts.map((fact: { label: string; value: string }) =>
          fact.label === "Application reference"
            ? { ...fact, value: secondStaffReference }
            : fact,
        ),
      },
    },
  });
}
