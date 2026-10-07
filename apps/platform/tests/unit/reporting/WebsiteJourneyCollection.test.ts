import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  createWebsiteAnalyticsBrowserFixture,
  loadWebsiteAnalyticsService as service,
} from "../../support/WebsiteAnalyticsBrowserFixture";

const callId = "00000000-0000-4000-8000-000000000042";
let browser: ReturnType<typeof createWebsiteAnalyticsBrowserFixture>;
beforeEach(() => {
  browser = createWebsiteAnalyticsBrowserFixture();
});
afterEach(() => vi.unstubAllGlobals());

describe("observed website journeys", () => {
  function journeys() {
    return browser.dataLayer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event" && entry[1] === "website_journey")
      .map((entry) => (entry[2] as { journey_path: string }).journey_path);
  }

  it("includes the public start-application click before its server redirect", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    browser.location.pathname = `/how-to-apply/funding/${callId}/eligibility`;
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView(`/how-to-apply/funding/${callId}`);
    analytics.pageView(browser.location.pathname);
    analytics.publicApplicationHandoff(callId);
    analytics.publicApplicationHandoff(callId);
    expect(journeys()).toEqual([
      "call_details>eligibility",
      "eligibility>start_application",
      "call_details>eligibility>start_application",
    ]);
    const events = browser.dataLayer.map((entry) => Array.from(entry));
    expect(
      events.filter((entry) => entry[1] === "application_start"),
    ).toHaveLength(0);
    expect(events.filter((entry) => entry[1] === "page_view")).toHaveLength(2);
  });

  it("excludes authentication and portal activity and breaks public sequence continuity", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView("/resources");
    for (const path of ["/sign-in", "/portal", "/portal/applications/new"]) {
      browser.location.pathname = path;
      analytics.pageView(path);
      analytics.publicApplicationHandoff(callId);
    }
    browser.location.pathname = `/funding/${callId}`;
    analytics.pageView(browser.location.pathname);
    expect(journeys()).toEqual([]);
  });

  it("records actual ordered routes with no private IDs, queries or duplicate renders", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView("/how-to-apply");
    analytics.pageView("/eligibility");
    analytics.pageView(`/funding/${callId}`);
    analytics.pageView(`/funding/${callId}`);
    expect(journeys()).toEqual([
      "how_to_apply>eligibility",
      "eligibility>call_details",
      "how_to_apply>eligibility>call_details",
    ]);
    expect(journeys().join(" ")).not.toContain(callId);
    expect(JSON.stringify(browser.dataLayer)).not.toContain("private-id");
    expect(JSON.stringify(browser.dataLayer)).not.toContain("secret");
  });

  it("retains the bounded sequence across reloads without repeating a page", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    let analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView("/funding");
    analytics.pageView(`/funding/${callId}`);
    vi.resetModules();
    analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView(`/funding/${callId}`);
    analytics.pageView(`/how-to-apply/funding/${callId}/apply`);
    expect(journeys()).toEqual([
      "funding>call_details",
      "call_details>start_application",
      "funding>call_details>start_application",
    ]);
    expect(browser.storage.get("smefund:analytics:journey")).not.toContain(
      callId,
    );
  });

  it("breaks sequences at excluded routes and after consent withdrawal", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView("/resources");
    browser.location.pathname = "/cms";
    expect(analytics.configure("G-TEST123")).toBe(false);
    browser.location.pathname = "/funding";
    analytics.configure("G-TEST123");
    analytics.pageView("/funding");
    expect(journeys()).toEqual([]);
    analytics.chooseConsent("declined");
    expect(browser.storage.has("smefund:analytics:journey")).toBe(false);
    analytics.pageView("/resources");
    analytics.chooseConsent("accepted");
    analytics.pageView(`/funding/${callId}`);
    expect(journeys()).toEqual([]);
  });

  it("expires a journey after 30 idle minutes", async () => {
    const time = vi.spyOn(Date, "now");
    try {
      time.mockReturnValue(1000);
      browser.cookie = "smefund_analytics_consent=accepted";
      const analytics = await service();
      analytics.configure("G-TEST123");
      analytics.pageView("/resources");
      time.mockReturnValue(1000 + 30 * 60 * 1000);
      analytics.pageView(`/funding/${callId}`);
      expect(journeys()).toEqual([]);
    } finally {
      time.mockRestore();
    }
  });

  it("works without storage and rejects tampered stored route steps", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    browser.storage.set(
      "smefund:analytics:journey",
      JSON.stringify({
        steps: ["private-id"],
        updatedAt: Date.now(),
      }),
    );
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.pageView("/resources");
    expect(journeys()).toEqual([]);
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    analytics.pageView(`/funding/${callId}`);
    expect(journeys()).toEqual(["resources>call_details"]);
  });
});
