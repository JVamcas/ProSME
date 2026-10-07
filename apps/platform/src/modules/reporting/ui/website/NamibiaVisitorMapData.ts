import { parseGeoJSON } from "@/shared/ui/EChartRuntime";
import type { WebsiteRegion } from "../../domain/WebsiteAnalyticsPanels";
import boundary from "./assets/namibia-regions.json";
import { websiteChartColors } from "./WebsiteChartOptions";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";
import type { EChartsOption } from "@/shared/ui/EChartRuntime";

export const namibiaChartMap = {
  name: "namibia-visitor-regions",
  geoJSON: {
    type: "FeatureCollection" as const,
    features: boundary.features.map((feature) => ({
      type: "Feature" as const,
      properties: {
        name:
          feature.properties.shapeName === "Karas"
            ? "//Karas"
            : feature.properties.shapeName,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: feature.geometry.coordinates,
      },
    })),
  },
};

// ECharts derives region centres from the sourced polygons, not visitor locations.
const centres = new Map(
  parseGeoJSON(namibiaChartMap.geoJSON, "name").map((region) => [
    region.name,
    region.getCenter().slice(0, 2),
  ]),
);

export function namibiaVisitorMapOption(
  regions: WebsiteRegion[],
): EChartsOption {
  const known = regions.filter(
    (region): region is WebsiteRegion & { canonicalRegion: string } =>
      region.canonicalRegion !== null && centres.has(region.canonicalRegion),
  );
  const maximum = Math.max(1, ...known.map((region) => region.users));
  const hasUsers = known.some((region) => region.users > 0);
  return {
    animation: false,
    aria: { enabled: true },
    tooltip: {
      trigger: "item",
      valueFormatter: (value) =>
        typeof value === "number" && Number.isFinite(value)
          ? `${analyticsCount(value)} users`
          : "No data",
    },
    geo: {
      map: namibiaChartMap.name,
      roam: true,
      aspectScale: Math.cos((23 * Math.PI) / 180),
      scaleLimit: { min: 1, max: 8 },
      layoutCenter: ["50%", "46%"],
      layoutSize: "82%",
      label: { show: true, color: "#334155", fontSize: 11 },
      itemStyle: {
        areaColor: websiteChartColors.cream,
        borderColor: websiteChartColors.navy,
        borderWidth: 1,
      },
      emphasis: {
        itemStyle: { areaColor: websiteChartColors.blue },
        label: { color: websiteChartColors.navy, fontWeight: "bold" },
      },
    },
    visualMap: {
      show: hasUsers,
      type: "continuous",
      orient: "horizontal",
      left: "center",
      bottom: 32,
      min: 0,
      max: maximum,
      seriesIndex: 1,
      text: ["Visitors", ""],
      itemHeight: 160,
      itemWidth: 12,
      calculable: true,
      inRange: {
        color: [
          websiteChartColors.cream,
          websiteChartColors.blue,
          websiteChartColors.navy,
        ],
      },
    },
    series: [
      {
        name: "Regional visitors",
        type: "scatter",
        z: 3,
        coordinateSystem: "geo",
        geoIndex: 0,
        encode: { tooltip: 2 },
        data: known
          .filter((region) => region.users > 0)
          .map((region) => ({
            name: region.canonicalRegion,
            value: [...centres.get(region.canonicalRegion)!, region.users],
          })),
        symbolSize: (value: number[]) => 6 + 18 * Math.sqrt(value[2] / maximum),
        itemStyle: {
          color: websiteChartColors.orange,
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      },
      {
        type: "map",
        geoIndex: 0,
        data: known.map((region) => ({
          name: region.canonicalRegion,
          value: region.users,
        })),
      },
    ],
  };
}
