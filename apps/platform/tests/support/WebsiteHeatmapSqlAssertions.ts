import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  readWebsiteHeatmap,
  storeWebsiteHeatmap,
} from "@/modules/reporting/infrastructure/WebsiteHeatmapRepository";
import { heatmapBatch } from "./WebsiteHeatmapFixture";

export async function verifyWebsiteHeatmapSql() {
  const period = { startDate: "2026-10-07", endDate: "2026-10-07" };
  const timezone = "Africa/Windhoek";
  const first = heatmapBatch();
  await storeWebsiteHeatmap(first);
  await storeWebsiteHeatmap(first);
  await storeWebsiteHeatmap({
    ...first,
    maxDepth: 70,
    clicks: [...first.clicks, { sequence: 1, x: 30, y: 40 }],
  });
  await storeWebsiteHeatmap(first);
  const second = heatmapBatch("22222222-2222-4222-8222-222222222222");
  await storeWebsiteHeatmap(second);
  await getDatabase().execute(
    sql`UPDATE app_reporting_heatmap_views SET occurred_at = '2026-10-07T10:00:00Z'`,
  );
  const report = await readWebsiteHeatmap(period, timezone);
  assert.equal(report.variants.length, 1);
  assert.equal(report.selected?.views, 2);
  assert.deepEqual(report.clicks, [{ x: 30, y: 40, count: 3 }]);
  assert.equal(report.scroll.find((row) => row.depth === 20)?.share, 1);
  assert.equal(report.scroll.find((row) => row.depth === 30)?.share, 0.5);
  assert.equal(report.scroll.find((row) => row.depth === 70)?.views, 1);
  assert.equal(report.scroll.find((row) => row.depth === 80)?.views, 0);

  const original = report.selected!.id;
  const variant = heatmapBatch("33333333-3333-4333-8333-333333333333");
  variant.layout.viewportWidth = 400;
  await storeWebsiteHeatmap(variant);
  await getDatabase().execute(
    sql`UPDATE app_reporting_heatmap_views SET occurred_at = '2026-10-07T11:00:00Z' WHERE id = ${variant.viewId}::uuid`,
  );
  const separate = await readWebsiteHeatmap(
    { ...period, layoutId: original },
    timezone,
  );
  assert.equal(separate.variants.length, 2);
  assert.equal(separate.selected?.viewportWidth, 1000);
  assert.equal(separate.selected?.views, 2);
  assert.equal(separate.clicks[0].count, 3);

  // A reused anonymous view identifier cannot add events to a different layout.
  await storeWebsiteHeatmap({
    ...variant,
    viewId: first.viewId,
    maxDepth: 100,
    clicks: [{ sequence: 2, x: 90, y: 90 }],
  });
  const unchanged = await readWebsiteHeatmap(
    { ...period, layoutId: original },
    timezone,
  );
  assert.equal(unchanged.clicks.length, 1);
  assert.equal(unchanged.scroll.find((row) => row.depth === 100)?.views, 0);

  const call = heatmapBatch("44444444-4444-4444-8444-444444444444");
  const callId = "55555555-5555-4555-8555-555555555555";
  call.layout.page = `/funding/${callId}`;
  await storeWebsiteHeatmap(call);
  await getDatabase().execute(
    sql`UPDATE app_reporting_heatmap_views SET occurred_at = '2026-10-06T22:00:00Z' WHERE id = ${call.viewId}::uuid`,
  );
  const scoped = await readWebsiteHeatmap(
    { ...period, fundingCallId: callId },
    timezone,
  );
  assert.equal(scoped.variants.length, 1);
  assert.equal(scoped.selected?.page, call.layout.page);
  assert.equal(scoped.selected?.views, 1);
  await getDatabase().execute(
    sql`UPDATE app_reporting_heatmap_views SET occurred_at = '2026-10-07T22:00:00Z' WHERE id = ${call.viewId}::uuid`,
  );
  assert.equal(
    (await readWebsiteHeatmap({ ...period, fundingCallId: callId }, timezone))
      .selected,
    null,
  );
  assert.equal(
    (
      await readWebsiteHeatmap(
        { ...period, layoutId: "a".repeat(64) },
        timezone,
      )
    ).selected,
    null,
  );

  // More than 50 page layouts must remain a bounded SQL projection.
  for (let index = 0; index < 51; index += 1) {
    const sample = heatmapBatch(crypto.randomUUID());
    sample.layout.viewportWidth = 1100 + index;
    await storeWebsiteHeatmap(sample);
  }
  await getDatabase().execute(
    sql`UPDATE app_reporting_heatmap_views SET occurred_at = '2026-10-07T12:00:00Z' WHERE occurred_at > '2026-10-07T22:00:00Z'`,
  );
  const bounded = await readWebsiteHeatmap(period, timezone);
  assert.equal(bounded.variants.length, 50);
  assert.equal(bounded.truncated, true);
  const bad = heatmapBatch(crypto.randomUUID());
  bad.layout.viewportWidth = 3999;
  bad.clicks[0].x = 101;
  await assert.rejects(storeWebsiteHeatmap(bad));
  const rollback = await getDatabase().execute<{ count: number }>(
    sql`SELECT count(*)::integer AS count FROM app_reporting_heatmap_views WHERE id = ${bad.viewId}::uuid`,
  );
  assert.equal(rollback.rows[0].count, 0);
}
