import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  sanitizedAnalyticsReferrer,
  websiteAnalyticsPage,
} from "@/modules/reporting/domain/WebsiteAnalyticsCollection";

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
        browser.location.origin,
      ),
    ).toBe("https://outside.test");
    expect(
      sanitizedAnalyticsReferrer(
        "https://example.test/portal/applications/secret?token=secret",
        browser.location.origin,
      ),
    ).toBe("https://example.test/portal/applications/:id");
    expect(
      sanitizedAnalyticsReferrer(
        "https://example.test/cms?token=secret",
        browser.location.origin,
      ),
    ).toBe("");
    expect(
      sanitizedAnalyticsReferrer(
        "javascript:alert(1)",
        browser.location.origin,
      ),
    ).toBe("");
  });

  it("does not load providers or queue events before valid consent", async () => {
    const analytics = await service();
    for (const value of [
      "",
      "smefund_analytics_consent=declined",
      "smefund_analytics_consent=unexpected",
    ]) {
      browser.cookie = value;
      expect(analytics.configure("G-TEST123")).toBe(false);
      analytics.track("application_start", { fundingCallId: callId });
    }
    expect(browser.appended).toHaveLength(0);
    expect(browser.dataLayer).toHaveLength(0);
  });

  it("disables automatic page views and deduplicates confirmed signals across reloads", async () => {
    browser.cookie = "smefund_analytics_consent=accepted";
    let analytics = await service();
    expect(analytics.configure("G-TEST123")).toBe(true);
    analytics.pageView(browser.location.pathname);
    analytics.pageView(browser.location.pathname);
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
    const commands = browser.dataLayer.map((entry) => Array.from(entry));
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
    browser.cookie = "smefund_analytics_consent=accepted";
    const analytics = await service();
    analytics.configure("G-TEST123");
    analytics.track("application_start", {
      fundingCallId: callId,
      answers: "secret",
    } as never);
    expect(JSON.stringify(browser.dataLayer)).not.toContain("answers");
    analytics.chooseConsent("declined");
    const count = browser.dataLayer.length;
    analytics.track("application_submit", { fundingCallId: callId });
    expect(browser.dataLayer).toHaveLength(count);
    expect(
      (window as unknown as Record<string, boolean>)["ga-disable-G-TEST123"],
    ).toBe(true);
  });
});
