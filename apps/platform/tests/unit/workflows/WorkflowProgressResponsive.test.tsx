import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import { chromium, type Browser } from "playwright";
import postcss from "postcss";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApplicationDetailContent } from "@/modules/applications/ui/ApplicationDetailView";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { workflowProgressFixture } from "../../support/WorkflowProgressFixture";

const browserDescribe =
  process.env.RUN_WORKFLOW_RESPONSIVE_TESTS === "true"
    ? describe
    : describe.skip;

browserDescribe("workflow progress browser layout", () => {
  let browser: Browser;
  let css: string;

  beforeAll(async () => {
    const stylesheet = resolve("src/app/globals.css");
    const result = await postcss([tailwindcss({ base: process.cwd() })]).process(
      await readFile(stylesheet, "utf8"),
      { from: stylesheet },
    );
    css = result.css;
    browser = await chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  it.each([390, 820, 1440])("contains scrolling at %i pixels", async (width) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const markup = renderToStaticMarkup(
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">
        <ApplicationDetailContent
          model={{
            title: "Application",
            backHref: "/admin/applications",
            backLabel: "Applications",
            reference: "TEST-001",
            statusLabel: "Under review",
            statusBadgeLabel: "Submitted",
            statusDescription: "Your application is being assessed.",
            submittedAt: null,
            updatedAt: null,
            facts: [],
            sections: [],
            documents: [],
            applicantDetails: [],
            businessDetails: [],
          }}
          workflowProgress={
            <WorkflowProgressPanel
              progress={{
                ...workflowProgressFixture,
                graph: referenceWorkflow,
              }}
            />
          }
        />
      </main>,
    );
    await page.setContent(
      `<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>${markup}`,
    );
    // This fixture uses the real components' server markup without hydration.
    // Reveal the workflow tab to measure its browser layout.
    const panel = page.locator("[data-inert]").last();
    await panel.evaluate((element) => {
      element.removeAttribute("hidden");
      element.removeAttribute("inert");
      element.removeAttribute("style");
      element.classList.remove("hidden");
    });
    const graph = page.locator(
      '[aria-label="Workflow instance visual flow"]',
    );
    expect(await graph.isVisible()).toBe(true);
    expect(await panel.locator("table").isVisible()).toBe(true);

    const dimensions = await graph.evaluate((element) => ({
      pageWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      graphWidth: element.clientWidth,
      graphScrollWidth: element.scrollWidth,
      graphHeight: element.clientHeight,
    }));
    expect(dimensions.pageScrollWidth).toBeLessThanOrEqual(
      dimensions.pageWidth + 1,
    );
    expect(dimensions.graphScrollWidth).toBeGreaterThan(dimensions.graphWidth);
    expect(dimensions.graphHeight).toBeLessThanOrEqual(560);
    await graph.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    expect(
      await graph.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(0);

    const tableViewport = panel.locator("table").locator("..");
    const tableDimensions = await tableViewport.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(tableDimensions.width).toBeLessThanOrEqual(dimensions.pageWidth);
    if (dimensions.pageWidth < 960) {
      expect(tableDimensions.scrollWidth).toBeGreaterThan(tableDimensions.width);
    }
    await page.close();
  }, 30_000);
});
