import type { HeatmapBatch } from "@/modules/reporting/domain/WebsiteHeatmap";

export function heatmapBatch(
  viewId = "11111111-1111-4111-8111-111111111111",
): HeatmapBatch {
  return {
    viewId,
    layout: {
      page: "/",
      viewportWidth: 1000,
      documentHeight: 2000,
      boxes: [{ tag: "main", x: 0, y: 1000, width: 10000, height: 8000 }],
    },
    maxDepth: 20,
    clicks: [{ sequence: 0, x: 30, y: 40 }],
  };
}
