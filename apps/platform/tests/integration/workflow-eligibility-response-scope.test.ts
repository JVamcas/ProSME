import { randomUUID } from "node:crypto";
import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { readEligibilityQuestionResponseRecords } from "@/modules/workflows/infrastructure/WorkflowEligibilityValueRepository";
import { createEligibilitySourceAdapter } from "@/modules/eligibility/application/EligibilitySourceAdapter";
import type { EligibilityScreeningSourceRequest } from "@/modules/eligibility/domain/EligibilityDataResolution";

const enabled =
  process.env.RUN_ELIGIBILITY_RESPONSE_SCOPE_DATABASE_TESTS === "true";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
});
let connected = false;
const dialect = new PgDialect();
const ids = {
  application: randomUUID(),
  version: randomUUID(),
  form: randomUUID(),
  workflow: randomUUID(),
  oldStage: randomUUID(),
  currentStage: randomUUID(),
  oldTask: randomUUID(),
  currentTask: randomUUID(),
  oldResponse: randomUUID(),
  currentResponse: randomUUID(),
  question: randomUUID(),
};
const request: EligibilityScreeningSourceRequest = {
  applicationId: ids.application,
  binding: {
    sourceKind: "ELIGIBILITY_QUESTION_RESPONSE",
    sourceDefinitionId: ids.question,
    sourceVersionId: ids.version,
    sourceKey: "VERIFIED",
    valuePath: "value",
  },
  evaluatedAt: new Date(),
  input: { id: ids.question, stableKey: "VERIFIED" } as never,
};
const database = {
  execute: async (statement: Parameters<typeof dialect.sqlToQuery>[0]) => {
    const query = dialect.sqlToQuery(statement);
    return client.query(query.sql, query.params);
  },
};

beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  connected = true;
  await client.query("BEGIN");
  await client.query(`
    CREATE TEMP TABLE app_applications (id uuid, eligibility_rule_set_version_id uuid);
    CREATE TEMP TABLE app_workflow_instances (id uuid, application_id uuid);
    CREATE TEMP TABLE app_workflow_stage_instances (id uuid, workflow_instance_id uuid);
    CREATE TEMP TABLE app_workflow_tasks (id uuid, stage_instance_id uuid);
    CREATE TEMP TABLE app_eligibility_rule_set_question_bindings (
      question_id uuid, version_id uuid, code_snapshot text
    );
    CREATE TEMP TABLE app_eligibility_rule_set_verification_forms (
      version_id uuid, form_version_id uuid
    );
    CREATE TEMP TABLE app_form_responses (
      id uuid, workflow_task_id uuid, form_version_id uuid, status text, values jsonb
    );
    INSERT INTO app_applications VALUES ('${ids.application}', '${ids.version}');
    INSERT INTO app_workflow_instances VALUES ('${ids.workflow}', '${ids.application}');
    INSERT INTO app_workflow_stage_instances VALUES
      ('${ids.oldStage}', '${ids.workflow}'), ('${ids.currentStage}', '${ids.workflow}');
    INSERT INTO app_workflow_tasks VALUES
      ('${ids.oldTask}', '${ids.oldStage}'), ('${ids.currentTask}', '${ids.currentStage}');
    INSERT INTO app_eligibility_rule_set_question_bindings VALUES
      ('${ids.question}', '${ids.version}', 'VERIFIED');
    INSERT INTO app_eligibility_rule_set_verification_forms VALUES
      ('${ids.version}', '${ids.form}');
    INSERT INTO app_form_responses VALUES
      ('${ids.oldResponse}', '${ids.oldTask}', '${ids.form}', 'DRAFT', '{"VERIFIED":true}'),
      ('${ids.currentResponse}', '${ids.currentTask}', '${ids.form}', 'DRAFT', '{"VERIFIED":false}');
  `);
});

afterAll(async () => {
  if (!connected) return;
  await client.query("ROLLBACK");
  await client.end();
});

describe.skipIf(!enabled)("eligibility evidence task scope", () => {
  it("reads the current task response despite another stage iteration using the same form", async () => {
    const adapter = createEligibilitySourceAdapter(
      "ELIGIBILITY_QUESTION_RESPONSE",
      {
        read: (requests) =>
          readEligibilityQuestionResponseRecords(
            requests,
            database as never,
            ids.currentTask,
          ),
      },
    );
    const result = await adapter.resolve([request]);
    expect(result.get(ids.question)).toEqual({
      status: "RESOLVED",
      value: { sourceRecordId: ids.currentResponse, value: false },
    });
  });

  it("preserves each iteration's evidence independently", async () => {
    const records = await readEligibilityQuestionResponseRecords(
      [request],
      database as never,
      ids.oldTask,
    );
    expect(records).toEqual([
      {
        sourceDefinitionId: ids.question,
        sourceKey: "VERIFIED",
        sourceRecordId: ids.oldResponse,
        sourceVersionId: ids.version,
        values: { value: true },
      },
    ]);
  });

  it("does not fall back to old evidence when the requested task has no response", async () => {
    expect(
      await readEligibilityQuestionResponseRecords(
        [request],
        database as never,
        randomUUID(),
      ),
    ).toEqual([]);
  });

  it("keeps application isolation even when a valid response task is supplied", async () => {
    expect(
      await readEligibilityQuestionResponseRecords(
        [{ ...request, applicationId: randomUUID() }],
        database as never,
        ids.currentTask,
      ),
    ).toEqual([]);
  });

  it("keeps ambiguity checks for legacy form-less evaluations without task scope", async () => {
    const adapter = createEligibilitySourceAdapter(
      "ELIGIBILITY_QUESTION_RESPONSE",
      {
        read: (requests) =>
          readEligibilityQuestionResponseRecords(requests, database as never),
      },
    );
    const result = await adapter.resolve([request]);
    expect(result.get(ids.question)).toMatchObject({ status: "INVALID" });
  });

  it("does not reuse another task's answers for a missing current field", async () => {
    await client.query("SAVEPOINT missing_field");
    try {
      await client.query(
        "UPDATE app_form_responses SET values = '{}' WHERE id = $1",
        [ids.currentResponse],
      );
      expect(
        await readEligibilityQuestionResponseRecords(
          [request],
          database as never,
          ids.currentTask,
        ),
      ).toEqual([]);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT missing_field");
    }
  });

  it("rejects a response using a different form version without falling back", async () => {
    await client.query("SAVEPOINT wrong_form");
    try {
      await client.query(
        "UPDATE app_form_responses SET form_version_id = $1 WHERE id = $2",
        [randomUUID(), ids.currentResponse],
      );
      expect(
        await readEligibilityQuestionResponseRecords(
          [request],
          database as never,
          ids.currentTask,
        ),
      ).toEqual([]);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT wrong_form");
    }
  });
});
