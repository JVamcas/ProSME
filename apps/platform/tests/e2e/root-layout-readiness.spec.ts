import { writeFile } from "node:fs/promises";
import { expect, test } from "playwright/test";
import {
  installResponsivenessSession,
  responsivenessApplicationId as id,
  responsivenessSessionFile,
} from "./helpers/ResponsivenessSession";

test.skip(!responsivenessSessionFile, "Requires isolated synthetic sessions.");
test.beforeEach(async ({ context }) => {
  await installResponsivenessSession(context);
});

for (const destination of ["admin", "portal"]) {
  test(`root layout transition to ${destination} uses one document and a fresh dashboard`, async ({
    page,
  }, testInfo) => {
    const source = destination === "admin" ? "portal" : "admin";
    await page.goto(`/${source}/applications`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.dataset.releaseProbe = "old-root";
    });
    const documents: string[] = [];
    page.on("request", (request) => {
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      ) {
        documents.push(new URL(request.url()).pathname);
      }
    });
    const started = performance.now();
    await page
      .locator(
        `nav[aria-label="Switch portal space"] a[href="/${destination}"]`,
      )
      .filter({ visible: true })
      .first()
      .click();
    const ready =
      destination === "admin" ? "Total applications" : "My Application";
    await expect(
      page.getByRole("main").getByText(ready, { exact: true }),
    ).toBeVisible();
    const elapsedMs = performance.now() - started;
    expect(
      await page.evaluate(() => document.documentElement.dataset.releaseProbe),
    ).toBeUndefined();
    expect(documents).toEqual([`/${destination}`]);
    await writeFile(
      `/tmp/page-responsiveness/g4-root-${destination}-${testInfo.repeatEachIndex}.json`,
      JSON.stringify(
        {
          source,
          sample: testInfo.repeatEachIndex,
          destination,
          documents,
          elapsedMs,
          synthetic: true,
        },
        null,
        2,
      ),
    );
  });
}

test("help crosses the public root layout and history returns to an authorized portal", async ({
  page,
}, testInfo) => {
  await page.goto("/portal/applications", { waitUntil: "networkidle" });
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documents.push(new URL(request.url()).pathname);
    }
  });
  const started = performance.now();
  await page
    .getByRole("link", { name: "Help and support", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Email", exact: true }),
  ).toBeVisible();
  const publicElapsedMs = performance.now() - started;
  expect(documents).toEqual(["/contact"]);
  const returned = performance.now();
  await page.goBack();
  await expect(
    page
      .locator(`a[href="/portal/applications/${id}"]`)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await writeFile(
    `/tmp/page-responsiveness/g4-root-public-${testInfo.repeatEachIndex}.json`,
    JSON.stringify(
      {
        sample: testInfo.repeatEachIndex,
        publicElapsedMs,
        returnElapsedMs: performance.now() - returned,
        documents,
        synthetic: true,
      },
      null,
      2,
    ),
  );
});
