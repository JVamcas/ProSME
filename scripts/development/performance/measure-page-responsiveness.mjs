import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const baseURL = process.env.RESPONSIVENESS_BASE_URL ?? "http://localhost:3018";
const targets = [{ variant: "current", url: baseURL }];
if (process.env.RESPONSIVENESS_COMPARISON_URL) {
  targets.push({
    variant: "reference",
    url: process.env.RESPONSIVENESS_COMPARISON_URL,
  });
}
const sessionPath = process.env.RESPONSIVENESS_SESSION;
const outputPath = process.env.RESPONSIVENESS_OUTPUT;
const samples = Number(process.env.RESPONSIVENESS_SAMPLES ?? 5);
const sampleOffset = Number(process.env.RESPONSIVENESS_SAMPLE_OFFSET ?? 0);
const conditions = (
  process.env.RESPONSIVENESS_CONDITIONS ?? "cold,warm,delayed"
).split(",");
if (
  conditions.some(
    (condition) => !["cold", "warm", "delayed"].includes(condition),
  )
) {
  throw new Error(
    "RESPONSIVENESS_CONDITIONS must contain cold, warm or delayed.",
  );
}
const applicationId = "66666666-6666-4666-8666-666666666661";
if (!sessionPath || !outputPath) {
  throw new Error(
    "Set RESPONSIVENESS_SESSION and RESPONSIVENESS_OUTPUT to private temporary paths.",
  );
}
const { cookie } = JSON.parse(await readFile(sessionPath, "utf8"));
const routes = [
  {
    path: "/admin",
    source: "/admin/applications",
    heading: "Dashboard",
    ready: "Total applications",
  },
  {
    path: "/portal",
    source: "/portal/applications",
    heading: "Welcome",
    ready: "My Application",
  },
  {
    path: `/admin/applications/${applicationId}`,
    source: "/admin/applications",
    heading: "Application",
    ready: "Application overview",
  },
  {
    path: `/portal/applications/${applicationId}`,
    source: "/portal/applications",
    heading: "Application",
    ready: "Application overview",
  },
  {
    path: "/admin/applications",
    source: "/admin",
    heading: "Applications",
    ready: process.env.RESPONSIVENESS_APPLICATION_REFERENCE ?? "PERF-2026-000001",
  },
  {
    path: "/portal/applications",
    source: "/portal",
    heading: "applications",
    ready: "Submission test application",
  },
];

function delayBusinessReads() {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "exec",
      "smefund-responsiveness-test",
      "node",
      "/perf/runtime.cjs",
      "node",
      "/workspace/scripts/development/performance/delay-business-reads.cjs",
      "1500",
    ]);
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("locked")) resolve(child);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error("Business-read delay failed"));
    });
  });
}

async function observe(page, route) {
  await page.evaluate(({ heading, ready }) => {
    window.__responsiveness = {
      started: performance.now(),
      feedback: null,
      structure: null,
      data: null,
    };
    window.__responsivenessObserver?.disconnect();
    const update = () => {
      const timing = window.__responsiveness;
      const elapsed = performance.now() - timing.started;
      const main = document.querySelector("main");
      const title = main?.querySelector("h1")?.textContent ?? "";
      if (
        timing.feedback === null &&
        document.querySelector('[aria-busy="true"], main [role="status"]')
      ) {
        timing.feedback = elapsed;
      }
      const genericDetail =
        heading === "Application" &&
        /Application (details|overview)/i.test(title);
      const detailRecord =
        heading === "Application" &&
        title.includes("Submission test application");
      if (
        timing.structure === null &&
        (genericDetail ||
          detailRecord ||
          (heading !== "Application" &&
            title.toLowerCase().includes(heading.toLowerCase())))
      ) {
        timing.structure = elapsed;
      }
      if (
        timing.data === null &&
        timing.structure !== null &&
        main?.textContent?.includes(ready) &&
        !main.querySelector("[data-page-loading]")
      ) {
        timing.data = elapsed;
      }
    };
    window.__responsivenessObserver = new MutationObserver(update);
    window.__responsivenessObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }, route);
}

const browser = await chromium.launch();
const measurements = [];
try {
  for (const route of routes.filter(
    (item) =>
      !process.env.RESPONSIVENESS_ROUTE ||
      process.env.RESPONSIVENESS_ROUTE.split(",").includes(item.path),
  )) {
    for (const condition of conditions) {
      for (
        let sample = sampleOffset;
        sample < sampleOffset + samples;
        sample += 1
      ) {
        const orderedTargets = sample % 2 ? [...targets].reverse() : targets;
        for (const target of orderedTargets) {
          const baseURL = target.url;
          const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
          });
          await context.addCookies([
            {
              name: "__Host-smefund_session",
              value: cookie,
              url: baseURL.replace("http:", "https:"),
              secure: true,
              httpOnly: true,
              sameSite: "Lax",
            },
          ]);
          const page = await context.newPage();
          const requests = [];
          page.on("response", async (response) => {
            const request = response.request();
            const path = new URL(response.url()).pathname;
            if (
              !path.startsWith("/api/") &&
              !request.isNavigationRequest() &&
              !request.headers().rsc
            )
              return;
            await response.finished().catch(() => undefined);
            const timing = request.timing();
            requests.push({
              path,
              location: response.headers()["location"],
              navigation: request.isNavigationRequest(),
              rsc: request.headers().rsc,
              status: response.status(),
              startedAt: timing.startTime,
              durationMs: timing.responseEnd,
            });
          });
          await page.route("**/*", (request) => {
            const headers = request.request().headers();
            if (
              headers["next-router-prefetch"] ||
              headers.purpose === "prefetch"
            )
              return request.abort();
            return request.continue();
          });
          if (condition === "cold") {
            const started = performance.now();
            await page.goto(`${baseURL}${route.path}`, {
              waitUntil: "domcontentloaded",
            });
            await page
              .getByRole("main")
              .getByText(route.ready, { exact: false })
              .filter({ visible: true })
              .first()
              .waitFor();
            const navigation = await page.evaluate(() => {
              const entry = performance.getEntriesByType("navigation")[0];
              return {
                ttfb: entry.responseStart,
                structure: entry.domContentLoadedEventEnd,
              };
            });
            measurements.push({
              route: route.path,
              condition,
              sample,
              variant: target.variant,
              requests,
              ttfbMs: navigation.ttfb,
              structureMs: navigation.structure,
              dataMs: performance.now() - started,
            });
          } else {
            await page.goto(`${baseURL}${route.source}`, {
              waitUntil: "networkidle",
            });
            await page.locator(`a[href="${route.path}"]`).first().waitFor();
            if (condition === "delayed") await delayBusinessReads();
            await observe(page, route);
            await page.locator(`a[href="${route.path}"]`).first().click();
            await page.waitForFunction(
              () => window.__responsiveness.data !== null,
              { timeout: 30000 },
            );
            const timing = await page.evaluate(() => window.__responsiveness);
            measurements.push({
              route: route.path,
              condition,
              sample,
              variant: target.variant,
              requests,
              feedbackMs: timing.feedback,
              structureMs: timing.structure,
              dataMs: timing.data,
            });
          }
          await context.close();
        }
      }
      console.log(`${route.path}: ${condition} samples collected`);
    }
  }
} finally {
  await browser.close();
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        mode: "production",
        viewport: [1440, 1000],
        samples,
        sampleOffset,
        conditions,
        businessDelayMs: 1500,
        recordedAt: new Date().toISOString(),
        measurements,
      },
      null,
      2,
    ),
  );
}
