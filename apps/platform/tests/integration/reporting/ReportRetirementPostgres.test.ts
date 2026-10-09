import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const enabled = process.env.RUN_REPORTING_RETIREMENT_TESTS === "true";
const client = new Client({ connectionString: process.env.DATABASE_URL });
let migration = "";
beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  migration = await readFile(
    new URL("../../../drizzle/0170_retire_website_reports.sql", import.meta.url),
    "utf8",
  );
  await client.query(`UPDATE app_reporting_schedules SET enabled = true,
    timezone = 'Africa/Windhoek', anchor_date = '2026-10-08', next_period_start = '2026-10-08',
    next_due_at = '2026-10-24T07:00:00Z' WHERE frequency = 'BIWEEKLY'`);
  await client.query(`INSERT INTO app_reporting_runs
    (schedule_id, schedule_version, frequency, start_date, end_date, timezone,
     contract_version, configuration, due_at, lease_token, lease_expires_at)
    SELECT id, 1, frequency, '2026-10-08', '2026-10-21', timezone,
      'd1-v2', '{}', next_due_at, gen_random_uuid(), now() + interval '5 minutes'
    FROM app_reporting_schedules WHERE frequency = 'BIWEEKLY'`);
  await client.query(`INSERT INTO app_notification_outbox
    (event_id, event_key, aggregate_type, aggregate_id, occurrence_key, correlation_id, context)
    SELECT id, event_key, 'website-report', gen_random_uuid(), 'legacy-proof', 'legacy-proof', '{}'
    FROM app_notification_events WHERE event_key = 'reporting.website.biweekly'`);
  await client.query(`INSERT INTO app_reporting_runs
    (schedule_id, schedule_version, frequency, start_date, end_date, timezone,
     contract_version, configuration, due_at, state, snapshot, generated_at, occurrence_id)
    SELECT schedule.id, 1, schedule.frequency, '2026-09-24', '2026-10-07', schedule.timezone,
      'd1-v2', '{}', schedule.next_due_at, 'GENERATED', '{"proof":"immutable history"}', now(), occurrence.id
    FROM app_reporting_schedules schedule CROSS JOIN app_notification_outbox occurrence
    WHERE schedule.frequency = 'BIWEEKLY' AND occurrence.occurrence_key = 'legacy-proof'`);
});
afterAll(async () => {
  if (enabled) await client.end();
});

async function apply() {
  await client.query("BEGIN");
  try {
    await client.query(migration);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

(enabled ? describe : describe.skip)(
  "repeatable legacy retirement with historical PostgreSQL records",
  () => {
    it("refuses an active legacy report lease and rolls back every retirement step", async () => {
      await expect(apply()).rejects.toThrow("active website report leases");
      expect(
        (await client.query("SELECT count(*)::integer AS total FROM app_reporting_runs")).rows[0]
          .total,
      ).toBe(2);
      await client.query(
        "UPDATE app_reporting_runs SET lease_expires_at = now() - interval '1 second' WHERE state = 'PENDING'",
      );
    });
    it("refuses in-flight notification dispatch until it has been reconciled", async () => {
      await client.query(
        "UPDATE app_notification_outbox SET status = 'PROCESSING' WHERE occurrence_key = 'legacy-proof'",
      );
      await expect(apply()).rejects.toThrow("active website notification claims");
      await client.query(
        "UPDATE app_notification_outbox SET status = 'PENDING' WHERE occurrence_key = 'legacy-proof'",
      );
    });
    it("retires twice, preserves history/continuity and unrelated global rules, and prevents old claims", async () => {
      const before = (
        await client.query(
          "SELECT count(*) AS total FROM app_notification_event_rules rule JOIN app_notification_events event ON event.id = rule.event_id WHERE event.event_key = 'application.submitted'",
        )
      ).rows;
      await apply();
      await apply();
      expect(
        (await client.query("SELECT to_regclass('public.app_reporting_runs') AS old")).rows[0].old,
      ).toBeNull();
      expect(
        (
          await client.query(
            "SELECT snapshot FROM app_reporting_retired_website_runs WHERE state = 'GENERATED'",
          )
        ).rows[0].snapshot,
      ).toEqual({ proof: "immutable history" });
      expect(
        (
          await client.query(
            "SELECT enabled, next_period_start::text AS cursor, timezone FROM app_reporting_retired_website_schedules WHERE frequency = 'BIWEEKLY'",
          )
        ).rows[0],
      ).toEqual({ enabled: true, cursor: "2026-10-08", timezone: "Africa/Windhoek" });
      expect(
        (
          await client.query(
            "SELECT status FROM app_notification_outbox WHERE occurrence_key = 'legacy-proof'",
          )
        ).rows[0].status,
      ).toBe("DEAD_LETTER");
      expect(
        (
          await client.query(
            "SELECT count(*) AS total FROM app_notification_event_rules rule JOIN app_notification_events event ON event.id = rule.event_id WHERE event.event_key = 'application.submitted'",
          )
        ).rows,
      ).toEqual(before);
      await expect(
        client.query(
          "UPDATE app_reporting_retired_website_runs SET snapshot = '{}' WHERE state = 'GENERATED'",
        ),
      ).rejects.toThrow("immutable");
    });
  },
);
