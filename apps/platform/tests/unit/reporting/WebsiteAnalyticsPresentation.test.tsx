import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { namibiaVisitorRegions } from "@/modules/reporting/domain/NamibiaVisitorRegions";
import { NamibiaVisitorMap } from "@/modules/reporting/ui/website/NamibiaVisitorMap";
import { WebsiteAnalyticsPanel } from "@/modules/reporting/ui/website/WebsiteAnalyticsPanel";
import { WebsiteVisitorGeography } from "@/modules/reporting/ui/website/WebsiteVisitorGeography";
import { WebsiteHeatmapPanel } from "@/modules/reporting/ui/website/WebsiteHeatmapPanel";
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
vi.mock("@/modules/reporting/ui/website/useWebsiteHeatmap", () => ({
  useWebsiteHeatmap: () => ({
    data: {
      collectionEnabled: true,
      timezone: "Africa/Windhoek",
      variants: [],
      selected: null,
      clicks: [],
      scroll: [],
      truncated: false,
    },
    error: null,
    isFetching: false,
  }),
}));

describe("D1 presentation contracts", () => {
  it("shows honest heatmap empty results without a provider login", () => {
    const markup = renderToStaticMarkup(
      <WebsiteHeatmapPanel
        period={{ startDate: "2026-10-01", endDate: "2026-10-07" }}
      />,
    );
    expect(markup).toContain("Heatmaps &amp; scroll depth");
    expect(markup).toContain(
      "No recorded public-page views for this selection.",
    );
    expect(markup).not.toContain("<a");
    expect(markup).not.toContain("<iframe");
  });

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
    const names = namibiaChartMap.geoJSON.features.map(
      ({ properties }) => properties.name,
    );
    expect(names.sort()).toEqual([...namibiaVisitorRegions].sort());
    const markup = renderToStaticMarkup(<NamibiaVisitorMap regions={[]} />);
    expect(markup).toContain("Interactive map of Namibia’s 14 regions");
    expect(markup).not.toContain("<path");
    expect(markup).toContain("height:clamp(320px, 60vw, 560px)");
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
