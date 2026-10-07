import { readFile } from "node:fs/promises";
import {
  createReportingDatabaseFixture,
  fullBatch,
  reportingConfiguration,
  reportingDatabaseEnabled,
} from "./WebsiteAnalyticsDatabaseFixture";
import { websiteAnalyticsQueryIdentity } from "@/modules/reporting/infrastructure/WebsiteAnalyticsQueryIdentity";
import type { ClaimedWebsiteReport } from "@/modules/reporting/infrastructure/WebsiteReportClaimRepository";

export const reportRecipientId = "10000000-0000-4000-8000-000000000001";

export function createWebsiteReportDatabaseFixture() {
  const base = createReportingDatabaseFixture();
  async function migration(name: string) {
    return base.client.query(
      await readFile(
        new URL(`../../drizzle/${name}.sql`, import.meta.url),
        "utf8",
      ),
    );
  }
  return {
    ...base,
    get client() {
      return base.client;
    },
    async prepare() {
      await base.prepare();
      if (!reportingDatabaseEnabled) return;
      await base.client.query(`
        CREATE TABLE app_users(id uuid PRIMARY KEY, display_name text, email text, status text);
        CREATE TABLE app_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE, name text);
        CREATE TABLE app_capabilities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE, description text);
        CREATE TABLE app_user_roles(user_id uuid, role_id uuid, PRIMARY KEY(user_id, role_id));
        CREATE TABLE app_role_capabilities(role_id uuid, capability_id uuid, PRIMARY KEY(role_id, capability_id));
        CREATE TABLE app_authorization_audit_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text,
          action text, changes jsonb, target_user_id uuid, target_role_id uuid, role_code text, created_at timestamptz DEFAULT now());
        INSERT INTO app_users VALUES ('${reportRecipientId}', 'Report reader', 'reader@example.test', 'active');
        INSERT INTO app_roles(code, name) VALUES ('system_administrator', 'System Administrator');
        INSERT INTO app_user_roles SELECT '${reportRecipientId}', id FROM app_roles;
      `);
      for (const name of [
        "0119_align_notification_rule_aggregate",
        "0122_notification_outbox_processing",
        "0131_notification_target_default_subjects",
        "0132_notification_specific_recipients",
        "0139_authentication_notification_events",
        "0141_notification_dead_letter",
      ]) {
        await migration(name);
      }
      await base.client.query(
        `INSERT INTO app_notification_channels(code, display_name, channel_type) VALUES ('EMAIL', 'Email', 'EMAIL') ON CONFLICT DO NOTHING`,
      );
      await migration("0168_website_report_delivery");
      await migration("0168_website_report_delivery");
    },
    async reset() {
      await base.reset();
      await base.client.query(`
        TRUNCATE app_reporting_runs, app_notification_outbox, app_notification_deliveries;
        DELETE FROM app_notification_event_rule_recipients;
        UPDATE app_reporting_schedules SET enabled = false, anchor_date = NULL, timezone = NULL,
          next_period_start = NULL, next_due_at = NULL, version = 1;
        UPDATE app_users SET status = 'active';
        INSERT INTO app_role_capabilities SELECT role.id, permission.id FROM app_roles role CROSS JOIN app_capabilities permission
          WHERE role.code = 'system_administrator' ON CONFLICT DO NOTHING;
        INSERT INTO app_notification_event_rule_recipients(rule_id, recipient_type, recipient_user_id)
          SELECT rule.id, 'SPECIFIC_USER', '${reportRecipientId}' FROM app_notification_event_rules rule
          JOIN app_notification_events event ON event.id = rule.event_id WHERE event.event_key LIKE 'reporting.website.%';
        INSERT INTO app_notification_event_rule_channels(rule_recipient_id, channel_id)
          SELECT recipient.id, channel.id FROM app_notification_event_rule_recipients recipient CROSS JOIN app_notification_channels channel
          WHERE channel.code = 'EMAIL';
      `);
    },
    async due(frequency = "MONTHLY") {
      await base.client.query(
        `UPDATE app_reporting_schedules SET enabled = true,
        anchor_date = '2026-09-01', next_period_start = '2026-09-01', timezone = 'Africa/Windhoek',
        next_due_at = now() - interval '1 day' WHERE frequency = $1`,
        [frequency],
      );
    },
    async sources(
      job: ClaimedWebsiteReport,
      fetchedAt = new Date().toISOString(),
    ) {
      const identity = websiteAnalyticsQueryIdentity(
        { startDate: job.startDate, endDate: job.endDate },
        reportingConfiguration,
        true,
      );
      await base.client.query(
        `INSERT INTO app_reporting_website_queries(query_key, property_id, timezone, collection_start,
        contract_version, start_date, end_date, include_panels) VALUES ($1,'123','Africa/Windhoek','2026-01-01','d1-v2',$2,$3,true)
        ON CONFLICT DO NOTHING`,
        [identity.queryKey, job.startDate, job.endDate],
      );
      await base.client.query(
        `INSERT INTO app_reporting_website_source_snapshots(query_key, source_name, state, data, fetched_at)
        SELECT $1, key, value->>'state', value->'data', $3::timestamptz FROM jsonb_each($2::jsonb)
        ON CONFLICT(query_key, source_name) DO UPDATE SET data=EXCLUDED.data, fetched_at=EXCLUDED.fetched_at`,
        [identity.queryKey, JSON.stringify(fullBatch()), fetchedAt],
      );
      return identity;
    },
  };
}
