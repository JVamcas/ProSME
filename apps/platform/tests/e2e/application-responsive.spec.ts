import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

test.setTimeout(60_000);

function availableStep(label: string, state: string, value: string) {
  return `
    <li class="relative flex flex-1 flex-col items-center">
      <button
        aria-label="${label}, ${state}"
        class="relative z-10 grid size-11 place-items-center rounded-full border-2 border-brand-navy/20 bg-brand-white text-xs font-bold text-brand-navy"
        type="button"
      >${value}</button>
      <span class="mt-2 text-center text-xs font-semibold text-brand-navy/65">
        ${label}
      </span>
    </li>`;
}

function progressBar() {
  return `
    <div
      aria-label="Application completion"
      aria-valuemax="100"
      aria-valuemin="0"
      aria-valuenow="33"
      class="h-2 min-w-24 overflow-hidden rounded-full bg-brand-cream"
      role="progressbar"
    >
      <div class="h-full rounded-full bg-brand-orange" style="width: 33%"></div>
    </div>`;
}

function applicationMarkup() {
  return `
    <div class="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 class="text-3xl font-bold text-brand-navy">Applications</h1>
      <nav aria-label="Application sections" class="overflow-x-auto border-b border-brand-navy/10 px-5 py-5">
        <ol class="flex min-w-[640px] items-start">
          ${availableStep("Business", "complete", "✓")}
          ${availableStep("Project details", "current", "2")}
          ${availableStep("Financial information", "not complete", "3")}
        </ol>
      </nav>
      <div class="mt-6 hidden overflow-x-auto md:block">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead><tr><th>Opportunity</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead>
          <tbody><tr>
            <td>SME Growth and Equipment Fund</td>
            <td><span class="bg-brand-yellow text-brand-navy">Draft</span></td>
            <td>${progressBar()}</td>
            <td><a href="#continue">Continue</a></td>
          </tr></tbody>
        </table>
      </div>
      <div class="grid gap-3 md:absolute md:invisible">
          <article class="rounded-2xl border border-brand-navy/15 bg-brand-white p-5">
            <h2 class="font-bold text-brand-navy">SME Growth and Equipment Fund</h2>
            <span class="bg-brand-yellow text-brand-navy">Draft</span>
            <div class="mt-4">${progressBar()}</div>
            <a href="#continue">Continue</a>
          </article>
      </div>
    </div>`;
}

async function mountApplicationScreen(page: Page) {
  const response = await page.request.get("/");
  expect(response.ok()).toBe(true);
  const document = await response.text();
  const stylesheetUrls = [
    ...document.matchAll(/href="([^"]+\.css[^"]*)"/g),
  ].map((match) => new URL(match[1], response.url()).toString());
  await page.goto(stylesheetUrls[0], { waitUntil: "load" });
  const styles = stylesheetUrls
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  await page.setContent(`${viewport}${styles}<main>${applicationMarkup()}</main>`, {
    waitUntil: "load",
  });
}

test("application UI has accessible progress and status content", async ({
  page,
}) => {
  await mountApplicationScreen(page);
  const results = await new AxeBuilder({ page }).include("main").analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );

  expect(serious).toEqual([]);
  await expect(page.getByRole("progressbar").first()).toHaveAttribute(
    "aria-valuenow",
    "33",
  );
  await expect(
    page.getByRole("button", { name: "Project details, current" }),
  ).toBeVisible();
});

test("application UI adapts without page overflow", async ({ page }) => {
  await mountApplicationScreen(page);
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  const step = page.getByRole("button", { name: "Project details, current" });
  const box = await step.boundingBox();

  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  expect(box?.width).toBeGreaterThanOrEqual(43.9);
  expect(box?.height).toBeGreaterThanOrEqual(43.9);
  if (page.viewportSize()!.width < 768) {
    await expect(page.locator("article")).toBeVisible();
    await expect(page.locator("table")).toBeHidden();
  } else {
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("article")).toBeHidden();
  }
});
