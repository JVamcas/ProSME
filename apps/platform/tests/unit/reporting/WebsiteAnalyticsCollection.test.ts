import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  sanitizedAnalyticsReferrer,
  websiteAnalyticsPage,
} from "@/modules/reporting/domain/WebsiteAnalyticsCollection";

const callId = "00000000-0000-4000-8000-000000000042";
let cookie = "";
let location: URL;
let dataLayer: IArguments[];
let storage: Map<string, string>;
let appended: unknown[];

beforeEach(() => {
  vi.resetModules();
  cookie = "";
  location = new URL(
    "https://example.test/portal/applications/private-id/edit?email=secret#answer",
  );
  dataLayer = [];
  appended = [];
  storage = new Map();
  vi.stubGlobal("window", { location, dataLayer });
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
    referrer: "https://example.test/register?email=secret",
    createElement: () => ({}),
    head: { appendChild: (element: unknown) => appended.push(element) },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

async function service() {
  return (await import("@/modules/reporting/ClientWebsiteAnalyticsService"))
    .clientWebsiteAnalyticsService;
}

describe("D1 collection privacy", () => {
  it("templates private routes and excludes staff, CMS, profiles and requests", () => {
    expect(
      websiteAnalyticsPage("/portal/applications/private-id/edit")?.path,
    ).toBe("/portal/applications/:id/edit");
    for (const path of [
      "/admin",
      "/cms",
      "/portal/profile",
      "/portal/applications/id/requests/private-id",
    ]) {
      expect(websiteAnalyticsPage(path)).toBeNull();
    }
    expect(
      websiteAnalyticsPage(`/how-to-apply/funding/${callId}`)?.fundingCallId,
    ).toBe(callId);
    expect(websiteAnalyticsPage("/how-to-apply/funding/not-a-call")).toBeNull();
  });

  it("removes URL/referrer secrets", () => {
    expect(
      sanitizedAnalyticsReferrer(
        "https://outside.test/private?email=secret#token",
        location.origin,
      ),
    ).toBe("https://outside.test");
    expect(
      sanitizedAnalyticsReferrer(
        "https://example.test/portal/applications/secret?token=secret",
        location.origin,
      ),
    ).toBe("https://example.test/portal/applications/:id");
    expect(
      sanitizedAnalyticsReferrer(
        "https://example.test/cms?token=secret",
        location.origin,
      ),
    ).toBe("");
    expect(
      sanitizedAnalyticsReferrer("javascript:alert(1)", location.origin),
    ).toBe("");
  });

  it("does not load providers or queue events before valid consent", async () => {
    const analytics = await service();
    for (const value of [
      "",
      "smefund_analytics_consent=declined",
      "smefund_analytics_consent=unexpected",
    ]) {
      cookie = value;
      expect(analytics.configure("G-TEST123")).toBe(false);
      analytics.track("application_start", { fundingCallId: callId });
    }
    expect(appended).toHaveLength(0);
    expect(dataLayer).toHaveLength(0);
  });

  it("disables automatic page views and deduplicates confirmed signals across reloads", async () => {
    cookie = "smefund_analytics_consent=accepted";
    let analytics = await service();
    expect(analytics.configure("G-TEST123")).toBe(true);
    analytics.pageView(location.pathname);
    analytics.pageView(location.pathname);
    analytics.track(
      "application_start",
      { fundingCallId: callId },
      "private-id",
    );
    analytics.track(
      "application_start",
      { fundingCallId: callId },
      "private-id",
    );
    vi.resetModules();
    analytics = await service();
    analytics.configure("G-TEST123");
    analytics.track(
      "application_start",
      { fundingCallId: callId },
      "private-id",
    );
    const commands = dataLayer.map((entry) => Array.from(entry));
    expect(
      commands.filter(
        (entry) => entry[0] === "event" && entry[1] === "application_start",
      ),
    ).toHaveLength(1);
    expect(
      commands.filter(
        (entry) => entry[0] === "event" && entry[1] === "page_view",
      ),
    ).toHaveLength(1);
    expect(commands.find((entry) => entry[0] === "config")?.[2]).toMatchObject({
      send_page_view: false,
    });
    expect(JSON.stringify(commands)).not.toContain("private-id");
    expect(JSON.stringify(commands)).not.toContain("secret");
  });

  it("allowlists event metadata and stops after consent is withdrawn", async () => {
    cookie = "smefund_analytics_consent=accepted";
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.track("application_start", {
      fundingCallId: callId,
      answers: "secret",
    } as never);
    expect(JSON.stringify(dataLayer)).not.toContain("answers");
    analytics.chooseConsent("declined");
    const count = dataLayer.length;
    analytics.track("application_submit", { fundingCallId: callId });
    expect(dataLayer).toHaveLength(count);
    expect(
      (window as unknown as Record<string, boolean>)["ga-disable-G-TEST123"],
    ).toBe(true);
  });
});
