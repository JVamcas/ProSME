import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  consentv2: vi.fn(),
}));
vi.mock("clarity-js", () => ({ clarity: sdk }));

let current: URL;
let cookie = "smefund_analytics_consent=accepted";
const listeners = new Map<string, (event: unknown) => void>();
const mask = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  listeners.clear();
  current = new URL("https://example.test/");
  cookie = "smefund_analytics_consent=accepted";
  vi.stubGlobal("location", current);
  vi.stubGlobal("history", { pushState: vi.fn(), replaceState: vi.fn() });
  vi.stubGlobal("window", {
    addEventListener: (event: string, fn: (event: unknown) => void) =>
      listeners.set(event, fn),
  });
  vi.stubGlobal("document", {
    cookie,
    referrer: "",
    body: { setAttribute: mask },
    addEventListener: (event: string, fn: (event: unknown) => void) =>
      listeners.set(event, fn),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Clarity public-only capture", () => {
  it("does not start before consent or on private/form/query routes", async () => {
    const { clientClarityService: clarity } =
      await import("@/modules/reporting/ClientClarityService");
    await clarity.update("abc12345", false);
    for (const path of [
      "/sign-in",
      "/portal",
      "/admin",
      "/cms",
      "/contact",
      "/how-to-apply/eligibility",
      "/?email=secret",
    ]) {
      current.href = `https://example.test${path}`;
      await clarity.update("abc12345", true);
    }
    expect(sdk.start).not.toHaveBeenCalled();
  });

  it("masks the complete page before starting, then stops before history navigation", async () => {
    const { clientClarityService: clarity } =
      await import("@/modules/reporting/ClientClarityService");
    const originalPushState = vi.mocked(history.pushState);
    await clarity.update("abc12345", true);
    expect(mask).toHaveBeenCalledWith("data-clarity-mask", "true");
    expect(mask.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.start.mock.invocationCallOrder[0],
    );
    expect(sdk.start).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "abc12345",
        mask: ["body"],
        content: false,
        track: false,
      }),
    );
    history.pushState(null, "", "/contact");
    expect(sdk.stop).toHaveBeenCalledOnce();
    expect(sdk.stop.mock.invocationCallOrder[0]).toBeLessThan(
      originalPushState.mock.invocationCallOrder[0],
    );
    clarity.stop();
    expect(sdk.consentv2).toHaveBeenLastCalledWith({
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
  });

  it("does not start after navigation while the SDK import is pending", async () => {
    const { clientClarityService: clarity } =
      await import("@/modules/reporting/ClientClarityService");
    const pending = clarity.update("abc12345", true);
    clarity.stop();
    await pending;
    expect(sdk.start).not.toHaveBeenCalled();
  });
});
