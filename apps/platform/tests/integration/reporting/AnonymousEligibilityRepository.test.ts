import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/platform/database/client";
import {
  aggregateAnonymousEligibilityChecks,
  recordAnonymousEligibilityCheck,
} from "@/modules/reporting/infrastructure/AnonymousEligibilityRepository";

const enabled = process.env.RUN_REPORTING_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    })
  : null;
const schema = `reporting_test_${randomUUID().replaceAll("-", "")}`;
const callA = "00000000-0000-4000-8000-000000000001";
const callB = "00000000-0000-4000-8000-000000000002";
const version = "00000000-0000-4000-8000-000000000003";
let prepared = false;

beforeAll(async () => {
  if (!client) return;
  await client.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  await client.query(`
    CREATE TABLE app_funding_calls (id uuid PRIMARY KEY, row_version integer, eligibility_rule_set_version_id uuid);
    CREATE TABLE app_eligibility_rule_set_versions (id uuid PRIMARY KEY);
    CREATE TABLE app_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text);
    CREATE TABLE app_capabilities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE, description text);
    CREATE TABLE app_role_capabilities (role_id uuid, capability_id uuid, PRIMARY KEY(role_id, capability_id));
    INSERT INTO app_roles (code) VALUES ('system_administrator'), ('cms_editor');
  `);
  const migration = await readFile(
    new URL(
      "../../../drizzle/0164_website_analytics_collection.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await client.query(migration);
  await client.query(
    "INSERT INTO app_eligibility_rule_set_versions VALUES ($1)",
    [version],
  );
  await client.query(
    "INSERT INTO app_funding_calls VALUES ($1, 7, $3), ($2, 2, $3)",
    [callA, callB, version],
  );
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(client) as ReturnType<typeof getDatabase>,
  );
  prepared = true;
});

afterAll(async () => {
  if (!client) return;
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
});

(enabled ? describe : describe.skip)(
  "isolated reporting SQL migration and projections",
  () => {
    it("creates only approved non-identifying columns and grants only explicit reporting authority", async () => {
      expect(prepared).toBe(true);
      const columns = await client!.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'app_reporting_anonymous_eligibility_checks' ORDER BY ordinal_position",
        [schema],
      );
      expect(columns.rows.map((row) => row.column_name)).toEqual([
        "id",
        "funding_call_id",
        "funding_call_version",
        "rule_set_version_id",
        "outcome",
        "occurred_at",
      ]);
      const grants = await client!.query(
        "SELECT role.code FROM app_roles role JOIN app_role_capabilities grant_record ON grant_record.role_id = role.id",
      );
      expect(grants.rows).toEqual([{ code: "system_administrator" }]);
    });

    it("records a confirmed category with the current call/ruleset versions", async () => {
      await recordAnonymousEligibilityCheck({
        fundingCallId: callA,
        ruleSetVersionId: version,
        outcome: "likely-eligible",
      });
      const result = await client!.query(
        "SELECT funding_call_version, outcome FROM app_reporting_anonymous_eligibility_checks",
      );
      expect(result.rows).toEqual([
        { funding_call_version: 7, outcome: "likely-eligible" },
      ]);
      await client!.query(
        "DELETE FROM app_reporting_anonymous_eligibility_checks",
      );
    });

    it("aggregates categories in SQL with call scoping and inclusive local end dates", async () => {
      await client!.query(
        `
      INSERT INTO app_reporting_anonymous_eligibility_checks
        (funding_call_id, funding_call_version, rule_set_version_id, outcome, occurred_at)
      VALUES
        ($1, 1, $3, 'likely-eligible', '2026-09-30T21:59:59Z'),
        ($1, 1, $3, 'likely-eligible', '2026-09-30T22:00:00Z'),
        ($1, 1, $3, 'likely-eligible', '2026-10-01T21:59:59Z'),
        ($1, 1, $3, 'review-required', '2026-10-01T22:00:00Z'),
        ($2, 1, $3, 'not-currently-eligible', '2026-10-01T10:00:00Z')
    `,
        [callA, callB, version],
      );
      const period = {
        startDate: "2026-10-01",
        endDate: "2026-10-01",
        timezone: "Africa/Windhoek",
      };
      expect(
        await aggregateAnonymousEligibilityChecks({
          ...period,
          fundingCallId: callA,
        }),
      ).toEqual([{ outcome: "likely-eligible", checks: 2 }]);
      expect(await aggregateAnonymousEligibilityChecks(period)).toEqual([
        { outcome: "likely-eligible", checks: 2 },
        { outcome: "not-currently-eligible", checks: 1 },
      ]);
    });
  },
);
