import { Window } from "happy-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeatmapBatch } from "@/modules/reporting/domain/WebsiteHeatmap";

let browser: Window;
let HttpError: typeof import("@/lib/client-http").ClientRequestError;
let cancel: (() => void) | undefined;
const upload =
  vi.fn<(batch: HeatmapBatch, final: boolean) => Promise<void> | void>();

beforeEach(async () => {
  vi.resetModules();
  HttpError = (await import("@/lib/client-http")).ClientRequestError;
  vi.clearAllMocks();
  browser = new Window({ url: "https://example.test/" });
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "Element",
    "NodeFilter",
    "Event",
    "MouseEvent",
  ] as const) {
    vi.stubGlobal(key, key === "window" ? browser : browser[key]);
  }
  vi.useFakeTimers();
  browser.setTimeout = setTimeout as unknown as typeof browser.setTimeout;
  browser.clearTimeout = clearTimeout;
  browser.setInterval = setInterval as unknown as typeof browser.setInterval;
  browser.clearInterval = clearInterval;
  Object.defineProperty(browser, "innerWidth", {
    value: 1000,
    configurable: true,
  });
  Object.defineProperty(browser, "innerHeight", {
    value: 400,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 2000,
    configurable: true,
  });
  document.body.innerHTML =
    '<main>Personal text <button>Click me</button></main><form><input value="secret" /><button>Submit</button></form>';
  vi.spyOn(
    document.querySelector("main")!,
    "getBoundingClientRect",
  ).mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1000,
    bottom: 2000,
    width: 1000,
    height: 2000,
    toJSON: () => ({}),
  });
});

afterEach(async () => {
  cancel?.();
  cancel = undefined;
  vi.useRealTimers();
  await browser.happyDOM.close();
  vi.unstubAllGlobals();
});

async function start(enabled = true) {
  const collector = (
    await import("@/modules/reporting/ClientWebsiteHeatmapCaptureService")
  ).clientWebsiteHeatmapCaptureService;
  cancel = collector.stop;
  collector.start(enabled, upload);
  return collector;
}

function click(target: Element, trusted = true) {
  const event = new MouseEvent("click", {
    bubbles: true,
    clientX: 300,
    clientY: 200,
  });
  Object.defineProperty(event, "isTrusted", { value: trusted });
  target.dispatchEvent(event);
}

describe("bounded anonymous public-page heatmap capture", () => {
  it.each([400, 403])(
    "stops a permanently rejected view (%s) and allows the next view",
    async (status) => {
      upload.mockRejectedValueOnce(new HttpError("Rejected batch", status));
      const collector = await start();
      await vi.advanceTimersByTimeAsync(1000);
      click(document.querySelector("main button")!);
      await vi.advanceTimersByTimeAsync(60000);
      expect(upload).toHaveBeenCalledOnce();
      collector.stop(true);
      expect(upload).toHaveBeenCalledOnce();
      collector.start(true, upload);
      await vi.advanceTimersByTimeAsync(1000);
      expect(upload).toHaveBeenCalledTimes(2);
    },
  );

  it.each([408, 429, 500])(
    "retries transient failures (%s) with the original view identity",
    async (status) => {
      upload.mockRejectedValueOnce(new HttpError("Temporary failure", status));
      await start();
      await vi.advanceTimersByTimeAsync(12000);
      expect(upload).toHaveBeenCalledTimes(2);
      expect(upload.mock.calls[0][0].viewId).toBe(
        upload.mock.calls[1][0].viewId,
      );
    },
  );

  it("does not stop a new view when an earlier upload is rejected", async () => {
    let rejectPrevious!: (reason: unknown) => void;
    upload.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectPrevious = reject;
        }),
    );
    const collector = await start();
    await vi.advanceTimersByTimeAsync(1000);
    collector.start(true, upload);
    await vi.advanceTimersByTimeAsync(1000);
    rejectPrevious(new HttpError("Old batch rejected", 400));
    await vi.advanceTimersByTimeAsync(0);
    click(document.querySelector("main button")!);
    await vi.advanceTimersByTimeAsync(11000);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[2][0].viewId).toBe(upload.mock.calls[1][0].viewId);
  });

  it("retries a failed initial batch without creating another view", async () => {
    upload.mockImplementationOnce(() => {
      throw new Error("Temporary upload failure");
    });
    await start();
    await vi.advanceTimersByTimeAsync(12000);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0].viewId).toBe(upload.mock.calls[1][0].viewId);
  });
  it("defers layout measurement and records only geometry", async () => {
    await start();
    expect(upload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(upload).toHaveBeenCalledOnce();
    const batch = upload.mock.calls[0][0];
    expect(batch.maxDepth).toBe(20);
    expect(batch.layout.boxes).toEqual([
      { tag: "main", x: 0, y: 0, width: 10000, height: 10000 },
    ]);
    expect(JSON.stringify(batch)).not.toMatch(
      /Personal|Click me|secret|Submit|input|form/,
    );
  });

  it.each([
    "/portal",
    "/cms",
    "/admin",
    "/sign-in",
    "/contact",
    "/how-to-apply/eligibility",
    "/?email=secret",
    "/about#secret",
  ])("does not capture excluded pages (%s)", async (path) => {
    location.href = `https://example.test${path}`;
    await start();
    await vi.advanceTimersByTimeAsync(20000);
    expect(upload).not.toHaveBeenCalled();
  });

  it("does not capture when collection is disabled", async () => {
    await start(false);
    await vi.advanceTimersByTimeAsync(20000);
    expect(upload).not.toHaveBeenCalled();
  });

  it.each(["", "declined", "accepted", "unexpected"])(
    "captures without depending on analytics consent (%s)",
    async (consent) => {
      if (consent) {
        document.cookie = `smefund_analytics_consent=${consent}; Path=/`;
      }
      await start();
      await vi.advanceTimersByTimeAsync(20000);
      expect(upload).toHaveBeenCalledOnce();
    },
  );

  it("batches actual clicks, ignores forms and synthetic events, and caps a view at 200 clicks", async () => {
    await start();
    await vi.advanceTimersByTimeAsync(1000);
    click(document.querySelector("form button")!);
    click(document.querySelector("main button")!, false);
    for (let index = 0; index < 250; index += 1)
      click(document.querySelector("main button")!);
    expect(upload).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(11000);
    const batch = upload.mock.calls.at(-1)![0];
    expect(batch.clicks).toHaveLength(200);
    expect(batch.clicks[0]).toEqual({ sequence: 0, x: 30, y: 10 });
    expect(batch.clicks[199].sequence).toBe(199);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("uses a passive scroll listener and one throttled check for a burst of scroll events", async () => {
    const listener = vi.spyOn(window, "addEventListener");
    await start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(listener).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    Object.defineProperty(browser, "scrollY", {
      value: 1000,
      configurable: true,
    });
    for (let index = 0; index < 100; index += 1)
      window.dispatchEvent(new Event("scroll"));
    expect(upload).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(11000);
    expect(upload.mock.calls.at(-1)![0].maxDepth).toBe(70);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("continues recording when Google Analytics consent changes", async () => {
    await start();
    await vi.advanceTimersByTimeAsync(1000);
    click(document.querySelector("main button")!);
    document.cookie = "smefund_analytics_consent=declined; Path=/";
    await vi.advanceTimersByTimeAsync(11000);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls.at(-1)![0].clicks).toHaveLength(1);
  });

  it("records an outgoing public-page click and stops before private navigation", async () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<a href="/portal">Apply</a>',
    );
    await start();
    await vi.advanceTimersByTimeAsync(1000);
    click(document.querySelector("a")!);
    expect(upload.mock.calls.at(-1)![0].clicks).toHaveLength(1);
    expect(upload.mock.calls.at(-1)![1]).toBe(true);
    history.pushState(null, "", "/portal");
    await vi.advanceTimersByTimeAsync(30000);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("bounds layout traversal and never includes more than 80 boxes", async () => {
    const { captureHeatmapLayout } =
      await import("@/modules/reporting/ClientWebsiteHeatmapLayoutService");
    document.body.innerHTML = "<section></section>".repeat(2000);
    for (const element of document.querySelectorAll("section")) {
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        toJSON: () => ({}),
      });
    }
    expect(captureHeatmapLayout("/")?.boxes).toHaveLength(80);
  });
});
