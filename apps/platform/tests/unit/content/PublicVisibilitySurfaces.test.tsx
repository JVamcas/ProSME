import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ visibility: {} as Record<string, boolean> }));
vi.mock(
  "@/modules/content/application/ServerPublicPageVisibilityService",
  () => ({
    getPublicPageVisibility: async () => state.visibility,
  }),
);
vi.mock("@/modules/content/ServerContentQueries", () => ({
  getHeader: async () => ({
    announcement: "Announcement",
    signInLabel: "Sign in",
    applyLabel: "Apply",
    applyHref: "/portal",
  }),
  getFooter: async () => ({
    tagline: "Tagline",
    summary: "Summary",
    newsletterHeading: "Subscribe",
    newsletterSummary: "Updates",
    copyright: "SME Fund",
  }),
  getContactDetails: async () => ({ email: "public@example.test" }),
  getSiteSettings: async () => ({ allowIndexing: true }),
  getNews: async () => [{ id: 42 }],
  getEvents: async () => [{ slug: "workshop" }],
}));
vi.mock("@/modules/content/ServerResourceCentreService", () => ({
  getResourceSitemapEntries: async () => [{ slug: "guide" }],
}));
vi.mock(
  "@/modules/funding-calls/application/ServerPublicFundingCallService",
  () => ({
    listPublicFundingCalls: async () => ({ items: [{ slug: "growth" }] }),
  }),
);
vi.mock("@/modules/engagement/ui/public/NewsletterForm", () => ({
  NewsletterForm: () => null,
}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ PUBLIC_SITE_URL: "https://example.test" }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { SiteHeader } from "@/modules/content/ui/public/SiteHeader";
import { SiteFooter } from "@/modules/content/ui/public/SiteFooter";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";
import sitemap from "@/app/sitemap";

beforeEach(() => {
  state.visibility = {};
});

describe("public visibility surfaces", () => {
  it("removes hidden destinations from both header navigation variants and footer", async () => {
    state.visibility = { news: false, funding: false };
    const header = renderToStaticMarkup(await SiteHeader());
    const footer = renderToStaticMarkup(await SiteFooter());
    for (const href of ["/news", "/funding", "/how-to-apply", "/eligibility"]) {
      expect(header).not.toContain(`href="${href}"`);
      expect(footer).not.toContain(`href="${href}"`);
    }
    expect(header.match(/href="\/resources"/g)).toHaveLength(2);
    expect(footer).toContain('href="/resources"');
    state.visibility = {};
    expect(
      renderToStaticMarkup(await SiteHeader()).match(/href="\/news"/g),
    ).toHaveLength(2);
  });

  it("filters nested navigation using all ancestors while retaining sibling destinations", async () => {
    state.visibility = { "funding.application-guide": false };
    const markup = renderToStaticMarkup(
      await HowToApplyNavigation({ active: "funding" }),
    );
    expect(markup).toContain('href="/how-to-apply/eligibility"');
    expect(markup).toContain('href="/how-to-apply/funding"');
    expect(markup).not.toContain('href="/how-to-apply"');
  });

  it("excludes both static pages and descendant entries from the sitemap", async () => {
    state.visibility = {
      news: false,
      resources: false,
      events: false,
      funding: false,
    };
    const urls = (await sitemap()).map((item) => item.url);
    expect(urls).toContain("https://example.test/about");
    for (const root of [
      "news",
      "resources",
      "events",
      "funding",
      "eligibility",
      "how-to-apply",
    ]) {
      expect(
        urls.some((url) => url.startsWith(`https://example.test/${root}`)),
      ).toBe(false);
    }
  });
});
