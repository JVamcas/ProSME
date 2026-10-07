import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { namibiaVisitorRegions } from "@/modules/reporting/domain/NamibiaVisitorRegions";
import { NamibiaVisitorMap } from "@/modules/reporting/ui/website/NamibiaVisitorMap";
import { WebsiteUserJourneys } from "@/modules/reporting/ui/website/WebsiteUserJourneys";
import { WebsiteAnalyticsPanel } from "@/modules/reporting/ui/website/WebsiteAnalyticsPanel";
import { WebsiteVisitorGeography } from "@/modules/reporting/ui/website/WebsiteVisitorGeography";
import { namibiaChartMap } from "@/modules/reporting/ui/website/NamibiaVisitorMapData";
import {
  filterPortalRoutes,
  operationsPortalRoutes,
} from "@/shared/ui/portal/portal-navigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { NavigationList } from "@/shared/ui/navigation/NavigationList";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics/website",
}));
vi.mock("@/shared/ui/portal/NavigationPendingIndicator", () => ({
  NavigationPendingIndicator: () => null,
}));

describe("D1 presentation contracts", () => {
  it("keeps the empty Namibia chart and its no-data caption visible", () => {
    const markup = renderToStaticMarkup(
      <WebsiteAnalyticsPanel
        title="Visitor geography — Namibia"
        scope="Namibia only"
        result={{
          state: "no-data",
          data: {
            country: "Namibia" as const,
            regions: [],
            regionalUserSum: 0,
            shareDenominator: "sum-of-regional-user-counts" as const,
          },
          fetchedAt: null,
          metadata: null,
          note: null,
        }}
      >
        {(data) => <WebsiteVisitorGeography data={data} />}
      </WebsiteAnalyticsPanel>,
    );
    expect(markup).toContain("Interactive map of Namibia’s 14 regions");
    expect(markup).toContain("No data");
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("No records found");
  });

  it("does not render zero-valued charts for a failed provider", () => {
    const chart = vi.fn(() => <p>Chart</p>);
    const markup = renderToStaticMarkup(
      <WebsiteAnalyticsPanel
        title="Website traffic"
        scope="Website-wide"
        result={{
          state: "failure",
          data: [],
          fetchedAt: null,
          metadata: null,
          note: "This analytics source could not be loaded.",
        }}
      >
        {chart}
      </WebsiteAnalyticsPanel>,
    );
    expect(chart).not.toHaveBeenCalled();
    expect(markup).toContain("This analytics source could not be loaded.");
  });

  it("uses all 14 sourced regions and projects Namibia rather than complementary world polygons", () => {
    const names = namibiaChartMap.geoJSON.features.map(({ properties }) => properties.name);
    expect(names.sort()).toEqual([...namibiaVisitorRegions].sort());
    const markup = renderToStaticMarkup(<NamibiaVisitorMap regions={[]} />);
    expect(markup).toContain("Interactive map of Namibia’s 14 regions");
    expect(markup).not.toContain("<path");
    expect(markup).toContain("height:clamp(320px, 60vw, 560px)");
  });

  it("keeps one measured journey visible when the other provider request fails", () => {
    const markup = renderToStaticMarkup(
      <WebsiteUserJourneys
        application={{
          state: "ready",
          data: {
            viewedUsers: 10,
            completedSelfCheckUsers: 7,
            startedUsers: 5,
            submittedUsers: 2,
          },
          fetchedAt: null,
          metadata: null,
          note: null,
        }}
        selfCheck={{
          state: "failure",
          data: null,
          fetchedAt: null,
          metadata: null,
          note: "Self-check source failed.",
        }}
        scope="Selected funding call"
      />,
    );
    expect(markup).toContain("Completed");
    expect(markup).toContain(">2</td>");
    expect(markup).toContain("20%");
    expect(markup).toContain("Self-check source failed.");
    expect(markup).toContain("Selected funding call");
  });

  it("filters before grouping, hides empty sections and retains accessible collapsed labels", () => {
    const routes = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      new Set([permissionCodes.reportingWebsiteReadAll]),
    );
    const groups = groupNavigationRoutes(routes);
    expect(groups.some((group) => group.label === "Analytics")).toBe(true);
    expect(groups.some((group) => group.label === "Administration")).toBe(
      false,
    );
    const markup = renderToStaticMarkup(
      <NavigationList routes={routes} collapsed />,
    );
    expect(markup).toContain('aria-label="Analytics"');
    expect(markup).toContain(">Analytics</p>");
    expect(markup).toContain('href="/admin/analytics/website"');
    expect(markup).not.toContain('href="analytics"');
    expect(markup).not.toContain("Website reports");
    expect(markup).toContain('aria-current="page"');
  });
});
