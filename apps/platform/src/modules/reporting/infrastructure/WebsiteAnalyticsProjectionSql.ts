import "server-only";
import { sql } from "drizzle-orm";
import {
  websiteMetricSources,
  websitePanelSources,
} from "../domain/WebsiteAnalyticsSnapshots";

export function websiteAnalyticsStoredSourcesSql() {
  return sql`
    SELECT registered.*,
      jsonb_object_agg(names.name, jsonb_build_object(
        'state', CASE
          WHEN snapshot.data IS NULL THEN
            CASE WHEN registered.failures ? names.name THEN 'failure' ELSE 'unavailable' END
          WHEN registered.failures ? names.name OR snapshot.fetched_at < CURRENT_TIMESTAMP - interval '10 minutes'
            THEN 'stale'
          ELSE snapshot.state END,
        'data', snapshot.data,
        'metadata', snapshot.metadata,
        'fetchedAt', snapshot.fetched_at,
        'note', CASE
          WHEN snapshot.data IS NULL AND registered.failures ? names.name
            THEN 'The analytics source could not be synchronized.'
          WHEN snapshot.data IS NULL THEN 'Waiting for the first analytics synchronization.'
          WHEN registered.failures ? names.name THEN 'Refresh failed; showing the last successful report.'
          WHEN snapshot.fetched_at < CURRENT_TIMESTAMP - interval '10 minutes'
            THEN 'Showing the last successful report while synchronization is pending.'
          ELSE snapshot.note END
      )) AS sources,
      jsonb_build_object(
        'state', CASE
          WHEN registered.lease_expires_at > CURRENT_TIMESTAMP THEN 'refreshing'
          WHEN registered.failures <> '{}'::jsonb THEN
            CASE WHEN count(snapshot.query_key) = 0 THEN 'failed' ELSE 'partial' END
          WHEN count(snapshot.query_key) < count(*) THEN 'pending'
          WHEN min(snapshot.fetched_at) < CURRENT_TIMESTAMP - interval '10 minutes' THEN 'pending'
          ELSE 'ready' END,
        'lastAttemptAt', registered.last_attempt_at,
        'lastSuccessAt', max(snapshot.fetched_at)
      ) AS synchronization
    FROM registered
    CROSS JOIN LATERAL jsonb_array_elements_text(
      ${JSON.stringify(websiteMetricSources)}::jsonb ||
      CASE WHEN registered.include_panels THEN ${JSON.stringify(websitePanelSources)}::jsonb ELSE '[]'::jsonb END
    ) AS names(name)
    LEFT JOIN app_reporting_website_source_snapshots snapshot
      ON snapshot.query_key = registered.query_key AND snapshot.source_name = names.name
    GROUP BY registered.query_key, registered.start_date, registered.include_panels,
      registered.lease_expires_at, registered.last_attempt_at, registered.failures
  `;
}

export function websiteAnalyticsChangesSql(
  currentKey: string,
  previousKey: string | undefined,
) {
  return sql`
    SELECT jsonb_object_agg(metric.name,
      CASE WHEN current_source->>'state' IN ('ready', 'no-data')
        AND previous_source->>'state' IN ('ready', 'no-data')
        AND (previous_source->'data'->>metric.field)::numeric > 0
      THEN ((current_source->'data'->>metric.field)::numeric -
        (previous_source->'data'->>metric.field)::numeric) /
        (previous_source->'data'->>metric.field)::numeric ELSE NULL END
    ) AS changes
    FROM (VALUES
      ('visitors', 'traffic', 'visitors'),
      ('pageViews', 'traffic', 'pageViews'),
      ('duration', 'traffic', 'averageSessionDurationSeconds'),
      ('starts', 'applicationReach', 'startedUsers'),
      ('submissions', 'applicationReach', 'submittedUsers'),
      ('conversion', 'starterCompletion', 'rate')
    ) AS metric(name, source, field)
    LEFT JOIN projected current_report ON current_report.query_key = ${currentKey}
    LEFT JOIN projected previous_report ON previous_report.query_key = ${previousKey ?? null}
    CROSS JOIN LATERAL (SELECT
      current_report.sources->metric.source AS current_source,
      previous_report.sources->metric.source AS previous_source
    ) AS metric_sources
  `;
}
