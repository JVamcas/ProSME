import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { init, type EChartsCoreOption } from "@/shared/ui/EChartRuntime";
import { WebsiteClickHeatmap } from "@/modules/reporting/ui/website/WebsiteClickHeatmap";
import { WebsiteScrollDepthChart } from "@/modules/reporting/ui/website/WebsiteScrollDepthChart";
import { heatmapBatch } from "../../support/WebsiteHeatmapFixture";

let options: EChartsCoreOption;
vi.mock("@/shared/ui/EChart", () => ({
  EChart: ({ option }: { option: EChartsCoreOption }) => {
    options = option;
    return null;
  },
}));

function nativeSvg() {
  const chart = init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 700,
    height: 400,
  });
  try {
    chart.setOption(options);
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

describe("native dashboard heatmaps", () => {
  it("renders masked layout geometry and real counted hotspots without an external page", () => {
    const markup = renderToStaticMarkup(
      <WebsiteClickHeatmap
        layout={{
          ...heatmapBatch().layout,
          id: "a".repeat(64),
          views: 7,
          lastSeenAt: "2026-10-07T10:00:00Z",
        }}
        clicks={[{ x: 30, y: 40, count: 5 }]}
      />,
    );
    const svg = nativeSvg();
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/NaN|undefined/);
    expect(markup).toContain("Masked layout");
    expect(markup).not.toMatch(/iframe|Clarity/);
  });
  it("shows measured scroll shares and an accessible count table", () => {
    const markup = renderToStaticMarkup(
      <WebsiteScrollDepthChart
        data={[
          { depth: 10, views: 8, share: 1 },
          { depth: 50, views: 4, share: 0.5 },
          { depth: 100, views: 1, share: 0.125 },
        ]}
      />,
    );
    expect(nativeSvg()).toContain("12.5%");
    expect(markup).toContain("Views reaching depth");
    expect(markup).toContain("50.0%");
    expect(markup).toContain("12.5%");
  });
});
