import type { CmsImage, StatisticItem } from "./ContentTypes";
import { media } from "./infrastructure/ContentProjection";

export type HomeImpactContent = {
  heading: string;
  summary: string;
  campaignMessage: string;
  backgroundImage?: CmsImage;
  items: StatisticItem[];
};

export function homeImpactContent(value: unknown): HomeImpactContent {
  const block = record(value);

  return {
    heading: text(block.heading),
    summary: text(block.summary),
    campaignMessage: text(block.campaignMessage),
    backgroundImage: media(block.backgroundImage),
    items: Array.isArray(block.items)
      ? block.items.map((item) => {
          const statistic = record(item);
          return {
            value: text(statistic.value),
            label: text(statistic.label),
          };
        })
      : [],
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
