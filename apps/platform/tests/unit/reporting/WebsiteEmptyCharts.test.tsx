import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  init,
  registerMap,
  type EChartsCoreOption,
} from "@/shared/ui/EChartRuntime";
import { WebsiteApplicationFunnelChart } from "@/modules/reporting/ui/website/WebsiteApplicationFunnelChart";
import { websiteTrafficOption } from "@/modules/reporting/ui/website/WebsiteChartOptions";
import { applicationFunnelOption } from "@/modules/reporting/ui/website/WebsiteApplicationFunnelOptions";
import { eligibilityChartOption } from "@/modules/reporting/ui/website/WebsiteEligibilityChartOptions";
import {
  namibiaChartMap,
  namibiaVisitorMapOption,
} from "@/modules/reporting/ui/website/NamibiaVisitorMapData";

function renderChart(option: EChartsCoreOption) {
  const chart = init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 500,
    height: 360,
  });
  try {
    chart.setOption(option);
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

const emptyFunnel = {
  viewedUsers: 0,
  completedSelfCheckUsers: 0,
  startedUsers: 0,
  submittedUsers: 0,
};

describe("native ECharts analytics rendering", () => {
  it("renders four native branded funnel stages with actual zero labels", () => {
    const svg = renderChart(applicationFunnelOption(emptyFunnel));
    expect(svg).toContain('<svg width="500" height="360"');
    for (const color of ["#6baed6", "#c9a24d", "#ff6f00", "#16a34a"]) {
      expect(svg).toContain(`fill="${color}"`);
    }
    const markup = renderToStaticMarkup(
      <WebsiteApplicationFunnelChart data={emptyFunnel} />,
    );
    expect(markup).not.toContain("<dl");
    expect(svg.match(/>0<\/text>/g)).toHaveLength(4);
    for (const label of [
      "Funding Call View",
      "Eligibility Check Completed",
      "Application Started",
      "Application Submitted",
    ]) {
      expect(svg).toContain(label.split(" ")[0]);
    }
  });

  it("renders four proportional native funnel stages using the measured counts", () => {
    const data = {
      viewedUsers: 100,
      completedSelfCheckUsers: 75,
      startedUsers: 50,
      submittedUsers: 20,
    };
    const svg = renderChart(applicationFunnelOption(data));
    expect(svg).not.toContain('fill="#f1f5f9"');
    for (const color of ["#6baed6", "#c9a24d", "#ff6f00", "#16a34a"]) {
      expect(svg).toContain(`fill="${color}"`);
    }
    for (const value of [100, 75, 50, 20]) {
      expect(svg).toContain(`>${value}</text>`);
    }
  });

  it("renders date axes and legends without inventing traffic", () => {
    const option = websiteTrafficOption([], "2026-09-06", "2026-10-07");
    const svg = renderChart(option);
    expect(svg).toContain("09-06");
    expect(svg).toContain("10-07");
    expect(svg).toContain("Page views");
    expect(svg).toContain("Sessions");
    const series = option.series as { data: (number | null)[] }[];
    expect(series.map((item) => item.data)).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("renders a neutral empty eligibility ring and its concise label", () => {
    const svg = renderChart(eligibilityChartOption([]));
    expect(svg).toContain("No checks");
    expect(svg).toContain('fill="#f6f4e2"');
  });

  it("renders all fourteen Namibia regions without visitors or WebGL", () => {
    registerMap(namibiaChartMap.name, namibiaChartMap.geoJSON);
    const svg = renderChart(namibiaVisitorMapOption([]));
    expect(svg.match(/fill="#f6f4e2"/g)).toHaveLength(14);
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("WebGL");
  });

  it("fits the whole country inside the taller map before any user zoom", () => {
    registerMap(namibiaChartMap.name, namibiaChartMap.geoJSON);
    const chart = init(null, undefined, {
      renderer: "svg",
      ssr: true,
      width: 500,
      height: 360,
    });
    try {
      chart.setOption(namibiaVisitorMapOption([]));
      const points = namibiaChartMap.geoJSON.features.flatMap((feature) =>
        feature.geometry.coordinates.flat(),
      );
      for (const coordinate of points) {
        const [x, y] = chart.convertToPixel({ geoIndex: 0 }, coordinate);
        expect(x).toBeGreaterThanOrEqual(7);
        expect(x).toBeLessThanOrEqual(493);
        expect(y).toBeGreaterThanOrEqual(7);
        expect(y).toBeLessThanOrEqual(333);
      }
    } finally {
      chart.dispose();
    }
  });

  it("preserves the country's proportions in a wide independent map panel", () => {
    registerMap(namibiaChartMap.name, namibiaChartMap.geoJSON);
    const chart = init(null, undefined, {
      renderer: "svg",
      ssr: true,
      width: 1400,
      height: 560,
    });
    try {
      chart.setOption(namibiaVisitorMapOption([]));
      const west = chart.convertToPixel({ geoIndex: 0 }, [12, -23]);
      const east = chart.convertToPixel({ geoIndex: 0 }, [22, -23]);
      const north = chart.convertToPixel({ geoIndex: 0 }, [12, -18]);
      const south = chart.convertToPixel({ geoIndex: 0 }, [12, -28]);
      expect((east[0] - west[0]) / (south[1] - north[1])).toBeCloseTo(
        Math.cos((23 * Math.PI) / 180),
        2,
      );
    } finally {
      chart.dispose();
    }
  });

  it("shares one geo projection for region shading and only measured scatter markers", () => {
    registerMap(namibiaChartMap.name, namibiaChartMap.geoJSON);
    const option = namibiaVisitorMapOption([
      {
        canonicalRegion: "Khomas",
        providerRegion: "Khomas",
        users: 20,
        share: 0.8,
      },
      {
        canonicalRegion: "Erongo",
        providerRegion: "Erongo",
        users: 0,
        share: 0,
      },
      {
        canonicalRegion: null,
        providerRegion: "Unknown",
        users: 5,
        share: 0.2,
      },
    ]);
    const series = option.series as {
      type: string;
      geoIndex: number;
      data: { name: string; value: number | number[] }[];
    }[];
    expect(series.map((item) => [item.type, item.geoIndex])).toEqual([
      ["scatter", 0],
      ["map", 0],
    ]);
    expect(series[0].data).toHaveLength(1);
    expect(series[0].data[0]).toMatchObject({ name: "Khomas" });
    const [longitude, latitude, users] = series[0].data[0].value as number[];
    expect(longitude).toBeGreaterThan(11);
    expect(longitude).toBeLessThan(26);
    expect(latitude).toBeGreaterThan(-30);
    expect(latitude).toBeLessThan(-16);
    expect(users).toBe(20);
    expect(series[1].data).toEqual([
      { name: "Khomas", value: 20 },
      { name: "Erongo", value: 0 },
    ]);
    const svg = renderChart(option);
    expect(svg).toContain('fill="#ff6f00"');
    expect(svg).not.toContain("NaN");
  });

  it("preserves map zoom when saved visitor counts refresh", () => {
    registerMap(namibiaChartMap.name, namibiaChartMap.geoJSON);
    const chart = init(null, undefined, {
      renderer: "svg",
      ssr: true,
      width: 500,
      height: 360,
    });
    try {
      chart.setOption(namibiaVisitorMapOption([]));
      chart.dispatchAction({
        type: "geoRoam",
        componentType: "geo",
        geoIndex: 0,
        zoom: 2,
        originX: 250,
        originY: 180,
      });
      const zoom = (chart.getOption().geo as { zoom: number }[])[0].zoom;
      expect(zoom).toBeGreaterThan(1);
      chart.setOption(
        namibiaVisitorMapOption([
          {
            canonicalRegion: "Khomas",
            providerRegion: "Khomas",
            users: 20,
            share: 1,
          },
        ]),
        { replaceMerge: ["series", "graphic", "visualMap"] },
      );
      expect((chart.getOption().geo as { zoom: number }[])[0].zoom).toBe(zoom);
    } finally {
      chart.dispose();
    }
  });
});
