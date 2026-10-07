import { z } from "zod";
import { isHeatmapPublicPath } from "../domain/WebsiteHeatmap";
import { websiteAnalyticsQuerySchema } from "./WebsiteAnalyticsSchemas";

const coordinate = z.number().int().min(0).max(10000);
const box = z
  .object({
    tag: z.enum([
      "header",
      "main",
      "footer",
      "section",
      "article",
      "nav",
      "button",
      "a",
    ]),
    x: coordinate,
    y: coordinate,
    width: coordinate.positive(),
    height: coordinate.positive(),
  })
  .strict()
  .refine(
    (value) =>
      value.x + value.width <= 10000 && value.y + value.height <= 10000,
  );

export const heatmapBatchSchema = z
  .object({
    viewId: z.uuid(),
    layout: z
      .object({
        page: z
          .string()
          .max(150)
          .transform((value) => value.replace(/\/$/, "") || "/")
          .refine(isHeatmapPublicPath),
        viewportWidth: z.number().int().min(100).max(4000),
        documentHeight: z.number().int().min(100).max(100000),
        boxes: z.array(box).max(80),
      })
      .strict(),
    maxDepth: z.number().int().min(0).max(100),
    clicks: z
      .array(
        z
          .object({
            sequence: z.number().int().min(0).max(199),
            x: z.number().int().min(0).max(99),
            y: z.number().int().min(0).max(99),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();

export const heatmapQuerySchema = websiteAnalyticsQuerySchema.safeExtend({
  layoutId: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

export const heatmapFilterSchema = z.object({ layoutId: z.string() });
