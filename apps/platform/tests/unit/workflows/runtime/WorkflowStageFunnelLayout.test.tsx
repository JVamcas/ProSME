import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { chromium, type Browser } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";
import { workflowProgressFixture } from "../../../support/WorkflowProgressFixture";

const browserDescribe =
  process.env.RUN_STAGE_FUNNEL_LAYOUT === "true" ? describe : describe.skip;

browserDescribe("stage funnel browser layout", () => {
  let browser: Browser;
  let css: string;
  beforeAll(async () => {
    const from = resolve("src/app/globals.css");
    css = (
      await postcss([tailwindcss({ base: process.cwd() })]).process(
        await readFile(from, "utf8"),
        { from },
      )
    ).css;
    const moduleCss = await readFile(
      resolve(
        "src/modules/workflows/ui/runtime/WorkflowStageFunnel.module.css",
      ),
      "utf8",
    );
    // Vitest's CSS module class names are extracted from the rendered DOM below.
    css += moduleCss;
    browser = await chromium.launch();
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
  });

  it.each([390, 820, 1440])(
    "keeps the pipe aligned and contained at %i px",
    async (width) => {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const markup = renderToStaticMarkup(
        <main className="w-full p-4">
          <WorkflowProgressPanel
            progress={workflowProgressFixture}
            funnel={{
              summary: {
                fundingCallTitle: "SME Growth",
                stages: [
                  {
                    stageKey: "eligibility",
                    name: "Eligibility",
                    sequence: 1,
                    count: 120,
                  },
                  {
                    stageKey: "technical",
                    name: "Technical Assessment",
                    sequence: 2,
                    count: 76,
                  },
                  {
                    stageKey: "other",
                    name: "Award decision and contractual conditions",
                    sequence: 3,
                    count: 10,
                  },
                ],
              },
              isLoading: false,
              canInspect: true,
              canExport: true,
              onInspect: () => {},
              onExport: () => {},
              onSelectDetails: () => {},
              onRetry: () => {},
            }}
          />
        </main>,
      );
      // Resolve the test runner's scoped module names to their actual CSS rules.
      const scopedCss = css.replaceAll(
        /\.pipeSegment|\.first|\.last/g,
        (name) => {
          const base = name.slice(1);
          const scoped = markup.match(new RegExp(`[^" ]*${base}[^" ]*`))?.[0];
          return scoped ? `.${scoped}` : name;
        },
      );
      await page.setContent(
        `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${scopedCss}</style>${markup}`,
      );
      const measurements = await page
        .locator('[aria-label="Workflow stages"] ol > li')
        .evaluateAll((rows) =>
          rows.map((row) => {
            const pipe = row.firstElementChild!;
            const stage = row.lastElementChild!;
            return {
              pipeWidth: pipe.getBoundingClientRect().width,
              pipeHeight: pipe.getBoundingClientRect().height,
              stageHeight: stage.getBoundingClientRect().height,
              hasNavyBackground:
                getComputedStyle(pipe).backgroundImage.includes(
                  "linear-gradient",
                ),
            };
          }),
        );
      expect(measurements).toHaveLength(3);
      for (const item of measurements) {
        expect(item.pipeWidth).toBe(100);
        expect(Math.abs(item.pipeHeight - item.stageHeight)).toBeLessThan(1);
        expect(item.hasNavyBackground).toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/stage-funnel-${width}.png`,
        fullPage: true,
      });
      await page.close();
    },
  );
});
