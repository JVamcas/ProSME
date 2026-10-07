import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { HeatmapBox } from "../domain/WebsiteHeatmap";

export const heatmapLayouts = pgTable(
  "app_reporting_heatmap_layouts",
  {
    id: text("id").primaryKey(),
    page: text("page").notNull(),
    viewportWidth: integer("viewport_width").notNull(),
    documentHeight: integer("document_height").notNull(),
    boxes: jsonb("boxes").$type<HeatmapBox[]>().notNull(),
  },
  (table) => [
    check(
      "app_reporting_heatmap_layouts_id_check",
      sql`${table.id} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "app_reporting_heatmap_layouts_viewport_width_check",
      sql`${table.viewportWidth} BETWEEN 100 AND 4000`,
    ),
    check(
      "app_reporting_heatmap_layouts_document_height_check",
      sql`${table.documentHeight} BETWEEN 100 AND 100000`,
    ),
    check(
      "app_reporting_heatmap_layouts_boxes_check",
      sql`jsonb_typeof(${table.boxes}) = 'array' AND jsonb_array_length(${table.boxes}) <= 80`,
    ),
  ],
);

export const heatmapViews = pgTable(
  "app_reporting_heatmap_views",
  {
    id: uuid("id").primaryKey(),
    layoutId: text("layout_id")
      .notNull()
      .references(() => heatmapLayouts.id),
    maxDepth: integer("max_depth").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_reporting_heatmap_views_period_idx").on(
      table.occurredAt,
      table.layoutId,
    ),
    check(
      "app_reporting_heatmap_views_max_depth_check",
      sql`${table.maxDepth} BETWEEN 0 AND 100`,
    ),
  ],
);

export const heatmapClicks = pgTable(
  "app_reporting_heatmap_clicks",
  {
    viewId: uuid("view_id")
      .notNull()
      .references(() => heatmapViews.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    x: integer("x").notNull(),
    y: integer("y").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.viewId, table.sequence] }),
    check(
      "app_reporting_heatmap_clicks_sequence_check",
      sql`${table.sequence} BETWEEN 0 AND 199`,
    ),
    check(
      "app_reporting_heatmap_clicks_x_check",
      sql`${table.x} BETWEEN 0 AND 99`,
    ),
    check(
      "app_reporting_heatmap_clicks_y_check",
      sql`${table.y} BETWEEN 0 AND 99`,
    ),
  ],
);
