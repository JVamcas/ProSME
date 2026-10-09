// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EChartsType } from "@/shared/ui/EChartRuntime";
import type { WebsiteTrafficDay } from "@/modules/reporting/domain/WebsiteAnalyticsPanels";
import { WebsiteTrafficChart } from "@/modules/reporting/ui/website/WebsiteTrafficChart";
import { WebsiteApplicationFunnelChart } from "@/modules/reporting/ui/website/WebsiteApplicationFunnelChart";

const runtime = vi.hoisted(() => ({
  width: 700,
  charts: [] as EChartsType[],
}));

vi.mock("@/shared/ui/EChartRuntime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ui/EChartRuntime")>();
  return {
    ...actual,
    // Use the real SVG renderer with explicit dimensions instead of DOM measurements.
    init: () => {
      const chart = actual.init(null, undefined, {
        renderer: "svg",
        ssr: true,
        width: runtime.width,
        height: 360,
      });
      runtime.charts.push(chart);
      return chart;
    },
  };
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const traffic: WebsiteTrafficDay[] = [
  { date: "2026-10-07", pageViews: 2, sessions: 2 },
  { date: "2026-10-08", pageViews: 66, sessions: 23 },
  { date: "2026-10-09", pageViews: 32, sessions: 13 },
];

async function mountTraffic(width: number) {
  runtime.width = width;
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <WebsiteTrafficChart
        data={traffic}
        startDate="2026-10-07"
        endDate="2026-10-09"
      />,
    );
  });
  return runtime.charts[0];
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  runtime.charts = [];
  document.body.replaceChildren();
});

describe("shared chart rendering with responsive options", () => {
  it.each([320, 700])("renders traffic on first mount at %ipx without Restore", async (width) => {
    const chart = await mountTraffic(width);
    const series = chart.getOption().series as { data: number[] }[];
    expect(series.map((item) => item.data)).toEqual([
      [2, 66, 32],
      [2, 23, 13],
    ]);
    const svg = chart.renderToSVGString();
    expect(svg).toContain("Page views");
    expect(svg).toContain("Sessions");
    expect(svg).toContain('stroke="#6baed6"');
    expect(svg).toContain('stroke="#c9a24d"');
    expect(svg).not.toContain("NaN");
  });

  it("updates traffic and keeps the selected zoom across refreshes and resizing", async () => {
    const chart = await mountTraffic(700);
    chart.dispatchAction({ type: "dataZoom", start: 25, end: 75 });
    const updated = traffic.map((day) => ({ ...day, pageViews: day.pageViews + 10 }));
    await act(async () => {
      root!.render(
        <WebsiteTrafficChart
          data={updated}
          startDate="2026-10-07"
          endDate="2026-10-09"
        />,
      );
    });
    expect(runtime.charts).toHaveLength(1);
    const series = chart.getOption().series as { data: number[] }[];
    expect(series[0].data).toEqual([12, 76, 42]);
    const zoom = chart.getOption().dataZoom as { start: number; end: number }[];
    expect(zoom[0]).toMatchObject({ start: 25, end: 75 });
    chart.resize({ width: 320 });
    expect(chart.getOption().series).toHaveLength(2);
    expect((chart.getOption().toolbox as { top: number }[])[0].top).toBe(32);
    chart.resize({ width: 700 });
    expect(chart.getOption().series).toHaveLength(2);
    expect((chart.getOption().toolbox as { top: number }[])[0].top).toBe(6);
  });

  it.each([320, 700])("renders the responsive application funnel on mount at %ipx", async (width) => {
    runtime.width = width;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <WebsiteApplicationFunnelChart
          data={{
            viewedUsers: 100,
            completedSelfCheckUsers: 75,
            startedUsers: 50,
            submittedUsers: 20,
          }}
        />,
      );
    });
    const chart = runtime.charts[0];
    const series = chart.getOption().series as {
      type: string;
      label: { width: number };
      data: { value: number }[];
    }[];
    expect(series).toHaveLength(1);
    expect(series[0].type).toBe("funnel");
    expect(series[0].label.width).toBe(width <= 380 ? 100 : 155);
    expect(series[0].data.map((item) => item.value)).toEqual([100, 75, 50, 20]);
    expect(chart.renderToSVGString()).toContain("Funding");
    expect(chart.renderToSVGString()).not.toContain("NaN");
  });
});
