import { randomUUID } from "node:crypto";

import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { loadRequiredTaskCompletions } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { stageCompletionRequirementsAreMet } from "@/modules/workflows/domain/runtime/StageCompletion";

const enabled = process.env.RUN_WORKFLOW_READINESS_DATABASE_TESTS === "true";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
});
const stageId = randomUUID();
const definitionId = randomUUID();
const taskId = randomUUID();
const dialect = new PgDialect();
const fixtureSchema = `readiness_${randomUUID().replaceAll("-", "")}`;

beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  await client.query("BEGIN");
  await client.query(`
    CREATE SCHEMA ${fixtureSchema};
    CREATE TEMP TABLE app_stage_task_definitions (
      id uuid PRIMARY KEY, stage_id uuid, code text, required_completion_count integer,
      completion_mode text, completion_percentage integer, reviewer_count integer,
      required boolean, sequence integer, task_type text, config jsonb
    );
    CREATE TEMP TABLE app_workflow_stage_instances (
      id uuid, workflow_stage_definition_id uuid
    );
    CREATE TEMP TABLE app_workflow_tasks (
      id uuid, stage_instance_id uuid, workflow_task_definition_id uuid,
      reviewer_slot integer, status text, assigned_user_id uuid,
      supersedes_task_id uuid, form_version_id uuid, result jsonb
    );
    CREATE TEMP TABLE app_form_responses (
      workflow_task_id uuid, status text, values jsonb
    );
    CREATE FUNCTION ${fixtureSchema}.app_workflow_task_coi_cleared(uuid, uuid)
      RETURNS boolean LANGUAGE sql AS 'SELECT true';
    SET LOCAL search_path TO ${fixtureSchema}, pg_temp, public;
  `);
  await client.query(`
    INSERT INTO app_workflow_stage_instances VALUES ($1, $2);
  `, [stageId, definitionId]);
  await client.query(`
    INSERT INTO app_stage_task_definitions VALUES (
      $1, $1, 'SCREENING', 1, 'COUNT', NULL, 1, true, 1,
      'CONTRIBUTING', '{}'
    );
  `, [definitionId]);
  await client.query(`
    INSERT INTO app_workflow_tasks VALUES (
      $1, $2, $3, 1, 'COMPLETED', $1, NULL, $3,
      '{"evaluatedFormValues":{"verified":true}}'
    );
  `, [taskId, stageId, definitionId]);
  await client.query(`
    INSERT INTO app_form_responses VALUES (
      $1, 'DRAFT', '{"verified":true}'
    );
  `, [taskId]);
});

afterAll(async () => {
  if (!enabled) return;
  await client.query("ROLLBACK");
  await client.end();
});

describe.skipIf(!enabled)("eligibility evidence in stage completion", () => {
  it.each([
    [{ formPurpose: "ELIGIBILITY_VERIFICATION" }, true, true],
    [{ command: "AUTHORITATIVE_ELIGIBILITY" }, true, true],
    [{ formPurpose: "ELIGIBILITY_VERIFICATION" }, false, false],
    [{ formPurpose: "APPLICATION_REVIEW" }, true, false],
  ])("checks the supported eligibility config and current evidence: %j", async (
    config,
    matchingEvidence,
    expectedReady,
  ) => {
    await client.query(
      "UPDATE app_stage_task_definitions SET config = $1::jsonb",
      [JSON.stringify(config)],
    );
    await client.query(
      "UPDATE app_form_responses SET values = $1::jsonb",
      [JSON.stringify({ verified: matchingEvidence })],
    );
    const database = {
      execute: async (statement: Parameters<typeof dialect.sqlToQuery>[0]) => {
        const query = dialect.sqlToQuery(statement);
        return client.query(query.sql, query.params);
      },
    };
    const requirements = await loadRequiredTaskCompletions(database as never, stageId);
    expect(requirements).toHaveLength(1);
    expect(requirements[0].completedCount).toBe(expectedReady ? 1 : 0);
    expect(requirements[0].completedTaskIds).toEqual(expectedReady ? [taskId] : []);
    expect(stageCompletionRequirementsAreMet(requirements)).toBe(expectedReady);
  });
});
