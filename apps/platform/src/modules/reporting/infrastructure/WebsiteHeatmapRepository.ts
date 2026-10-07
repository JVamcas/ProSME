import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type {
  HeatmapBatch,
  WebsiteHeatmapReport,
} from "../domain/WebsiteHeatmap";
import type { HeatmapQuery } from "../api/WebsiteHeatmapSchemas";

export async function storeWebsiteHeatmap(input: HeatmapBatch) {
  const layout = input.layout;
  const id = createHash("sha256").update(JSON.stringify(layout)).digest("hex");
  // Dependencies require ordering: layout -> anonymous view -> deduplicated clicks.
  await getDatabase().transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT set_config('statement_timeout', '2000', true), set_config('lock_timeout', '250', true)`,
    );
    await transaction.execute(sql`
      INSERT INTO app_reporting_heatmap_layouts (id, page, viewport_width, document_height, boxes)
      VALUES (${id}, ${layout.page}, ${layout.viewportWidth}, ${layout.documentHeight}, ${JSON.stringify(layout.boxes)}::jsonb)
      ON CONFLICT (id) DO NOTHING
    `);
    const view = await transaction.execute(sql`
      INSERT INTO app_reporting_heatmap_views (id, layout_id, max_depth)
      VALUES (${input.viewId}::uuid, ${id}, ${input.maxDepth})
      ON CONFLICT (id) DO UPDATE SET max_depth = greatest(app_reporting_heatmap_views.max_depth, excluded.max_depth)
      WHERE app_reporting_heatmap_views.layout_id = excluded.layout_id
      RETURNING id
    `);
    if (!view.rows.length || !input.clicks.length) return;
    await transaction.execute(sql`
      INSERT INTO app_reporting_heatmap_clicks (view_id, sequence, x, y)
      SELECT ${input.viewId}::uuid, sequence, x, y
      FROM jsonb_to_recordset(${JSON.stringify(input.clicks)}::jsonb) AS clicks(sequence integer, x integer, y integer)
      ON CONFLICT (view_id, sequence) DO NOTHING
    `);
  });
}

export async function readWebsiteHeatmap(
  input: HeatmapQuery,
  timezone: string,
) {
  const scope = input.fundingCallId
    ? sql`AND l.page IN (${`/funding/${input.fundingCallId}`}, ${`/how-to-apply/funding/${input.fundingCallId}`})`
    : sql``;
  const result = await getDatabase().execute<{
    report: Omit<WebsiteHeatmapReport, "collectionEnabled" | "timezone">;
  }>(sql`
    WITH scoped AS MATERIALIZED (
      SELECT v.id, v.layout_id, v.max_depth, v.occurred_at
      FROM app_reporting_heatmap_views v JOIN app_reporting_heatmap_layouts l ON l.id = v.layout_id
      WHERE v.occurred_at >= (${input.startDate}::date::timestamp AT TIME ZONE ${timezone})
        AND v.occurred_at < ((${input.endDate}::date + 1)::timestamp AT TIME ZONE ${timezone}) ${scope}
    ), variants AS (
      SELECT layout_id, count(*)::integer AS views, max(occurred_at) AS last_seen_at
      FROM scoped GROUP BY layout_id
    ), choices AS (
      SELECT l.id, l.page, l.viewport_width AS "viewportWidth", l.document_height AS "documentHeight",
        l.boxes, v.views, v.last_seen_at AS "lastSeenAt"
      FROM variants v JOIN app_reporting_heatmap_layouts l ON l.id = v.layout_id
      ORDER BY v.last_seen_at DESC, l.id LIMIT 50
    ), selected AS (
      SELECT * FROM choices WHERE (${input.layoutId ?? null}::text IS NULL OR id = ${input.layoutId ?? null})
      ORDER BY "lastSeenAt" DESC, id LIMIT 1
    ), selected_views AS MATERIALIZED (
      SELECT s.id, s.max_depth FROM scoped s JOIN selected l ON l.id = s.layout_id
    ), clicks AS (
      SELECT (c.x / 2) * 2 AS x, (c.y / 2) * 2 AS y, count(*)::integer AS count
      FROM app_reporting_heatmap_clicks c JOIN selected_views v ON v.id = c.view_id
      GROUP BY (c.x / 2) * 2, (c.y / 2) * 2 ORDER BY y, x
    ), scroll AS (
      SELECT depth, count(v.id) FILTER (WHERE v.max_depth >= depth)::integer AS views,
        CASE WHEN count(v.id) = 0 THEN 0 ELSE count(v.id) FILTER (WHERE v.max_depth >= depth)::float / count(v.id) END AS share
      FROM generate_series(10, 100, 10) AS depth LEFT JOIN selected_views v ON true GROUP BY depth ORDER BY depth
    )
    SELECT jsonb_build_object(
      'variants', coalesce((SELECT jsonb_agg(c ORDER BY c."lastSeenAt" DESC, c.id) FROM choices c), '[]'::jsonb),
      'truncated', (SELECT count(*) > 50 FROM variants),
      'selected', (SELECT to_jsonb(s) FROM selected s),
      'clicks', coalesce((SELECT jsonb_agg(c ORDER BY c.y, c.x) FROM clicks c), '[]'::jsonb),
      'scroll', coalesce((SELECT jsonb_agg(s ORDER BY s.depth) FROM scroll s), '[]'::jsonb)
    ) AS report
  `);
  return result.rows[0].report;
}
