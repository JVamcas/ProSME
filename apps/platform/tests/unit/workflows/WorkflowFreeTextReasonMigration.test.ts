import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { describe, expect, it } from "vitest";

const testUrl = process.env.WORKFLOW_REASON_MIGRATION_TEST_URL;
const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0151_workflow_free_text_reason.sql"),
  "utf8",
);

const governance = readFileSync(
  path.resolve(process.cwd(), "drizzle/0023_workflow_template_governance.sql"),
  "utf8",
);
const actionGovernance = readFileSync(
  path.resolve(process.cwd(), "drizzle/0026_workflow_action_definitions.sql"),
  "utf8",
);

function definition(source: string, prefix: string) {
  const statement = source
    .split("--> statement-breakpoint")
    .find((item) => item.trim().startsWith(prefix));
  if (!statement) throw new Error(`Missing migration statement: ${prefix}`);
  return statement;
}

async function applyMigration(client: pg.Client) {
  await client.query("BEGIN");
  try {
    for (const statement of migration.split("--> statement-breakpoint")) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

describe.skipIf(!testUrl)(
  "workflow free-text reason PostgreSQL migration",
  () => {
    it.each(["PUBLISHED", "RETIRED"])(
      "migrates %s versions and restores their immutability guard",
      async (versionStatus) => {
        const client = new pg.Client({ connectionString: testUrl });
        const schema = `reason_test_${crypto.randomUUID().replaceAll("-", "")}`;
        await client.connect();
        try {
          await client.query(`CREATE SCHEMA "${schema}"`);
          await client.query(`SET search_path TO "${schema}"`);
          await client.query(`
        CREATE TABLE app_workflow_definition_versions (id uuid PRIMARY KEY, status text);
        INSERT INTO app_workflow_definition_versions VALUES (
          '10000000-0000-4000-8000-000000000001', 'DRAFT'
        );
        CREATE TABLE app_workflow_stage_definitions (id uuid PRIMARY KEY, version_id uuid);
        INSERT INTO app_workflow_stage_definitions VALUES (
          '20000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001'
        );
        CREATE FUNCTION workflow_version_has_instances(uuid) RETURNS boolean
          AS 'SELECT false' LANGUAGE sql;
        CREATE TABLE app_workflow_action_definitions (
          stage_id uuid DEFAULT '20000000-0000-4000-8000-000000000001',
          id text PRIMARY KEY, action_type text, reason_code_required boolean,
          configuration jsonb NOT NULL
        );
        INSERT INTO app_workflow_action_definitions (id, action_type, reason_code_required, configuration) VALUES
          ('approve_optional', 'APPROVE_ADVANCE', false, '{}'),
          ('approve_required', 'APPROVE_ADVANCE', true, '{}'),
          ('reject', 'REJECT', false, '{"outcome":{"type":"TERMINAL","cancelOpenTasks":false,"cancelOpenStageInstances":false}}'),
          ('hold', 'PUT_ON_HOLD', false, '{"reasonCodes":["OTHER"],"scope":"STAGE"}'),
          ('defer', 'DEFER', false, '{}'),
          ('escalate', 'ESCALATE', false, '{}'),
          ('return_required', 'RETURN', false, '{"reasonRequired":true,"dataHandling":"RETAIN"}'),
          ('return_optional', 'RETURN', false, '{"reasonRequired":false,"dataHandling":"CLEAR"}');
        CREATE TABLE app_workflow_action_executions (reason_code text, comment text);
        INSERT INTO app_workflow_action_executions VALUES ('OLD_CODE', 'Historic explanation.');
        CREATE TABLE app_workflow_reworks (
          reason text NOT NULL,
          CONSTRAINT app_workflow_reworks_reason_check CHECK (length(btrim(reason)) > 0)
        );
      `);
          for (const table of ["holds", "deferrals", "escalations"]) {
            await client.query(`
          CREATE TABLE app_workflow_${table} (
            reason_code text, comment text,
            CONSTRAINT app_workflow_${table}_reason_check CHECK (
              reason_code IS NOT NULL OR length(btrim(coalesce(comment, ''))) > 0
            )
          );
        `);
          }
          await client.query(
            definition(
              governance,
              "CREATE OR REPLACE FUNCTION require_mutable_workflow_version",
            ),
          );
          await client.query(
            definition(
              actionGovernance,
              "CREATE OR REPLACE FUNCTION prevent_immutable_workflow_child_mutation",
            ),
          );
          await client.query(
            definition(
              actionGovernance,
              "CREATE TRIGGER app_workflow_actions_immutable",
            ),
          );
          await client.query(
            "UPDATE app_workflow_definition_versions SET status = $1",
            [versionStatus],
          );
          await expect(
            client.query(
              "UPDATE app_workflow_action_definitions SET reason_code_required = true WHERE id = 'reject'",
            ),
          ).rejects.toThrow("only draft workflow versions are editable");
          await applyMigration(client);
          const actions = await client.query(`
        SELECT id, reason_required AS required, configuration
        FROM app_workflow_action_definitions ORDER BY id
      `);
          expect(
            Object.fromEntries(
              actions.rows.map((row) => [row.id, row.required]),
            ),
          ).toEqual({
            approve_optional: false,
            approve_required: true,
            reject: true,
            hold: true,
            defer: true,
            escalate: true,
            return_required: true,
            return_optional: false,
          });
          expect(
            actions.rows.find((row) => row.id === "reject").configuration,
          ).toMatchObject({
            outcome: {
              type: "TERMINAL",
              cancelOpenTasks: true,
              cancelOpenStageInstances: true,
            },
          });
          expect(
            actions.rows.find((row) => row.id === "hold").configuration,
          ).toEqual({ scope: "STAGE" });
          expect(
            actions.rows.find((row) => row.id === "return_required")
              .configuration,
          ).toEqual({ dataHandling: "RETAIN" });
          expect(
            (await client.query("SELECT * FROM app_workflow_action_executions"))
              .rows,
          ).toEqual([{ reason: "OLD_CODE", comment: "Historic explanation." }]);
          for (const table of [
            "holds",
            "deferrals",
            "escalations",
            "reworks",
          ]) {
            await client.query(
              `INSERT INTO app_workflow_${table} (reason) VALUES (NULL)`,
            );
          }
          const guard = await client.query(`
          SELECT tgenabled FROM pg_trigger
          WHERE tgrelid = 'app_workflow_action_definitions'::regclass
            AND tgname = 'app_workflow_actions_immutable'
        `);
          expect(guard.rows).toEqual([{ tgenabled: "O" }]);
          await expect(
            client.query(
              "UPDATE app_workflow_action_definitions SET reason_required = false",
            ),
          ).rejects.toThrow("only draft workflow versions are editable");

          // Drizzle's transaction restores the guard even if a later statement fails.
          await client.query("BEGIN");
          await client.query(migration.split("--> statement-breakpoint")[0]);
          await expect(client.query("SELECT 1 / 0")).rejects.toThrow(
            "division by zero",
          );
          await client.query("ROLLBACK");
          await expect(
            client.query(
              "UPDATE app_workflow_action_definitions SET reason_required = false",
            ),
          ).rejects.toThrow("only draft workflow versions are editable");

          await client.query(
            "UPDATE app_workflow_definition_versions SET status = 'DRAFT'",
          );
          await client.query(
            "UPDATE app_workflow_action_definitions SET reason_required = false",
          );
          await client.query(
            "UPDATE app_workflow_definition_versions SET status = $1",
            [versionStatus],
          );
          await applyMigration(client);
          expect(
            (
              await client.query(`
        SELECT count(*)::int AS count FROM app_workflow_action_definitions WHERE reason_required
      `)
            ).rows[0].count,
          ).toBe(0);
        } finally {
          await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
          await client.end();
        }
      },
    );
  },
);
