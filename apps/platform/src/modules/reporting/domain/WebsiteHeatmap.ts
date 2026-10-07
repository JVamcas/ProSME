import { websiteAnalyticsPage } from "./WebsiteAnalyticsCollection";

export const heatmapPublicPages = [
  "/",
  "/about",
  "/how-to-apply",
  "/how-to-apply/funding",
  "/funding",
  "/news",
  "/events",
  "/resources",
  "/faq",
  "/terms",
  "/privacy",
] as const;

export function isHeatmapPublicPath(path: string) {
  const page = websiteAnalyticsPage(path);
  if (!page || page.path !== (path.replace(/\/$/, "") || "/")) return false;
  return (
    heatmapPublicPages.some((approved) => approved === page.path) ||
    (page.category === "funding-call" &&
      !page.path.endsWith("/eligibility") &&
      !page.path.endsWith("/apply"))
  );
}

export const heatmapFormSelector =
  'form, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-heatmap-mask]';

export type HeatmapBox = {
  tag:
    | "header"
    | "main"
    | "footer"
    | "section"
    | "article"
    | "nav"
    | "button"
    | "a";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeatmapLayout = {
  page: string;
  viewportWidth: number;
  documentHeight: number;
  boxes: HeatmapBox[];
};

export type HeatmapBatch = {
  viewId: string;
  layout: HeatmapLayout;
  maxDepth: number;
  clicks: { sequence: number; x: number; y: number }[];
};

export type HeatmapVariant = HeatmapLayout & {
  id: string;
  views: number;
  lastSeenAt: string;
};

export type WebsiteHeatmapReport = {
  collectionEnabled: boolean;
  timezone: string;
  variants: HeatmapVariant[];
  truncated: boolean;
  selected: HeatmapVariant | null;
  clicks: { x: number; y: number; count: number }[];
  scroll: { depth: number; views: number; share: number }[];
};
