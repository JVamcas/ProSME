import { randomUUID } from "node:crypto";

import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { initializeWorkflowReworkData } from "@/modules/workflows/infrastructure/WorkflowReworkDataRepository";
import { workflowDocumentEvidenceIsCurrent } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceReadiness";
import { sql } from "drizzle-orm";

const enabled = process.env.RUN_WORKFLOW_REWORK_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3_000,
    })
  : null;
const dialect = new PgDialect();
const workflowId = randomUUID();
const definitionId = randomUUID();
const formId = randomUUID();
const oldReviewer = randomUUID();
const newReviewer = randomUUID();
const actorId = randomUUID();
const originalStage = randomUUID();
const previousStage = randomUUID();
const currentStage = randomUUID();
const referringStage = randomUUID();
const previousTask = randomUUID();
const newTask = randomUUID();
const previousResponse = randomUUID();

async function query(text: string, values: unknown[] = []) {
  if (!client) throw new Error("Rework database tests are disabled.");
  return client.query(text, values);
}

beforeAll(async () => {
  if (!client) return;
  await client.connect();
  // Temporary tables isolate these query tests from application records.
  await query(`
    CREATE TEMP TABLE app_workflow_stage_instances (
      id uuid PRIMARY KEY, workflow_instance_id uuid,
      workflow_stage_definition_id uuid, iteration_number integer
    );
    CREATE TEMP TABLE app_workflow_tasks (
      id uuid PRIMARY KEY, stage_instance_id uuid,
      workflow_task_definition_id uuid, reviewer_slot integer,
      assigned_user_id uuid, form_version_id uuid, result jsonb,
      supersedes_task_id uuid, status text DEFAULT 'PENDING',
      created_at timestamptz DEFAULT now()
    );
    CREATE TEMP TABLE app_form_responses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workflow_task_id uuid,
      form_version_id uuid, respondent_user_id uuid, status text,
      values jsonb, created_by uuid, updated_by uuid,
      updated_at timestamptz DEFAULT now(),
      row_version integer DEFAULT 1, completed_at timestamptz,
      definition_snapshot jsonb,
      UNIQUE (workflow_task_id, respondent_user_id),
      CHECK (status <> 'DRAFT' OR
        (completed_at IS NULL AND definition_snapshot IS NULL))
    );
    CREATE TEMP TABLE app_workflow_audit_entries (
      actor_id uuid, action text, target_type text, target_id text,
      correlation_id uuid, workflow_instance_id uuid,
      stage_instance_id uuid, task_id uuid, after jsonb
    );
    CREATE TEMP TABLE app_workflow_task_document_evidence (
      task_id uuid, document_version_id uuid,
      PRIMARY KEY (task_id, document_version_id)
    );
  `);
});

beforeEach(async () => {
  if (!client) return;
  await query(`TRUNCATE app_workflow_stage_instances, app_workflow_tasks,
    app_form_responses, app_workflow_audit_entries,
    app_workflow_task_document_evidence`);
  await query(`INSERT INTO app_workflow_stage_instances VALUES
    ($1, $5, $6, 1), ($2, $5, $6, 2), ($3, $5, $6, 4),
    ($4, $5, $7, 3), ($8, $9, $6, 3)`, [
    originalStage, previousStage, currentStage, referringStage,
    workflowId, definitionId, randomUUID(), randomUUID(), randomUUID(),
  ]);
  await query(`INSERT INTO app_workflow_tasks
    (id, stage_instance_id, workflow_task_definition_id, reviewer_slot,
     assigned_user_id, form_version_id, result, status) VALUES
    ($1, $3, $5, 1, $6, $8, $9, 'COMPLETED'),
    ($2, $4, $5, 1, $7, $8, NULL, 'PENDING')`, [
    previousTask, newTask, previousStage, currentStage, definitionId,
    oldReviewer, newReviewer, formId,
    { comments: [{ key: "note", value: "Fix amount" }],
      evaluationId: "old-evaluation", formCompleted: true, decision: "APPROVE" },
  ]);
  await query(`INSERT INTO app_form_responses
    (id, workflow_task_id, form_version_id, respondent_user_id, status,
     values, created_by, updated_by, completed_at, definition_snapshot)
    VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $4, $4, now(), $6)`, [
    previousResponse, previousTask, formId, oldReviewer,
    { amount: 125, explanation: "Prior assessment" }, { versionId: formId },
  ]);
});

afterAll(async () => {
  await client?.end();
});

async function initialize(dataHandling: "RETAIN" | "CLEAR") {
  await initializeWorkflowReworkData({
    execute: async (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const compiled = dialect.sqlToQuery(statement);
      return query(compiled.sql, compiled.params);
    },
  } as never, {
    actorId,
    correlationId: randomUUID(),
    dataHandling,
    stageInstanceId: currentStage,
  });
}

(enabled ? describe : describe.skip)("rework data retention SQL", () => {
  it.each(["CLEAR", "RETAIN"] as const)(
    "%s scopes document evidence to the current task and preserves history",
    async (dataHandling) => {
      const versionId = randomUUID();
      await query(`INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)`,
        [previousTask, versionId]);
      await initialize(dataHandling);
      const evidence = await query(`SELECT task_id FROM app_workflow_task_document_evidence
        WHERE document_version_id = $1 ORDER BY task_id`, [versionId]);
      expect(evidence.rows.map((row) => row.task_id).sort()).toEqual(
        (dataHandling === "RETAIN" ? [previousTask, newTask] : [previousTask]).sort(),
      );
      const statement = dialect.sqlToQuery(sql`
        SELECT ${workflowDocumentEvidenceIsCurrent(sql`${newTask}::uuid`)} AS current
        FROM (SELECT ${versionId}::uuid AS id) evidence
      `);
      const scoped = await query(statement.sql, statement.params);
      expect(scoped.rows[0].current).toBe(dataHandling === "RETAIN");
    },
  );

  it("copies the latest target iteration into a fresh draft for the new reviewer", async () => {
    await initialize("RETAIN");
    const responses = await query(`SELECT * FROM app_form_responses
      WHERE workflow_task_id = $1`, [newTask]);
    expect(responses.rows).toHaveLength(1);
    expect(responses.rows[0]).toMatchObject({
      respondent_user_id: newReviewer,
      status: "DRAFT",
      values: { amount: 125, explanation: "Prior assessment" },
      row_version: 1,
      completed_at: null,
      definition_snapshot: null,
      created_by: actorId,
    });
    const tasks = await query(`SELECT * FROM app_workflow_tasks WHERE id = $1`, [newTask]);
    expect(tasks.rows[0]).toMatchObject({
      supersedes_task_id: previousTask,
      status: "PENDING",
      result: { comments: [{ key: "note", value: "Fix amount" }] },
    });
    const audit = await query("SELECT after FROM app_workflow_audit_entries");
    expect(audit.rows[0].after).toMatchObject({
      dataHandling: "RETAIN", sourceTaskId: previousTask,
      sourceResponseId: previousResponse, responseId: responses.rows[0].id,
    });
    const history = await query(`SELECT status, values FROM app_form_responses WHERE id = $1`, [previousResponse]);
    expect(history.rows[0]).toEqual({
      status: "COMPLETED", values: { amount: 125, explanation: "Prior assessment" },
    });
  });

  it("clears only new working data and keeps original evidence", async () => {
    await initialize("CLEAR");
    const responses = await query("SELECT workflow_task_id, status FROM app_form_responses");
    expect(responses.rows).toEqual([{ workflow_task_id: previousTask, status: "COMPLETED" }]);
    const tasks = await query("SELECT result, supersedes_task_id FROM app_workflow_tasks WHERE id = $1", [newTask]);
    expect(tasks.rows[0]).toEqual({ result: null, supersedes_task_id: previousTask });
    const audit = await query("SELECT after FROM app_workflow_audit_entries");
    expect(audit.rows[0].after).toMatchObject({ dataHandling: "CLEAR", responseId: null });
  });

  it("does not copy incompatible forms or another reviewer's slot", async () => {
    await query("UPDATE app_workflow_tasks SET form_version_id = $1 WHERE id = $2", [randomUUID(), newTask]);
    await initialize("RETAIN");
    expect((await query("SELECT id FROM app_form_responses WHERE workflow_task_id = $1", [newTask])).rows).toEqual([]);
    await query("TRUNCATE app_workflow_audit_entries");
    await query("UPDATE app_workflow_tasks SET reviewer_slot = 2, supersedes_task_id = NULL, result = NULL WHERE id = $1", [newTask]);
    await initialize("RETAIN");
    expect((await query("SELECT after FROM app_workflow_audit_entries")).rows).toEqual([]);
  });

  it("does not fall back to an older iteration when the latest has no response", async () => {
    await query("UPDATE app_workflow_tasks SET stage_instance_id = $1 WHERE id = $2", [originalStage, previousTask]);
    await initialize("RETAIN");
    expect((await query("SELECT id FROM app_form_responses WHERE workflow_task_id = $1", [newTask])).rows).toEqual([]);
    expect((await query("SELECT after FROM app_workflow_audit_entries")).rows).toEqual([]);
  });

  it("keeps multiple reviewer responses separate by task and slot", async () => {
    const secondSource = randomUUID();
    const secondTarget = randomUUID();
    const reviewer = randomUUID();
    await query(`INSERT INTO app_workflow_tasks
      (id, stage_instance_id, workflow_task_definition_id, reviewer_slot,
       assigned_user_id, form_version_id) VALUES
      ($1, $3, $5, 2, $6, $7), ($2, $4, $5, 2, $6, $7)`, [
      secondSource, secondTarget, previousStage, currentStage,
      definitionId, reviewer, formId,
    ]);
    await query(`INSERT INTO app_form_responses
      (workflow_task_id, form_version_id, respondent_user_id, status,
       values, created_by, updated_by)
      VALUES ($1, $2, $3, 'DRAFT', $4, $3, $3)`, [
      secondSource, formId, reviewer, { amount: 250 },
    ]);
    await initialize("RETAIN");
    const responses = await query(`SELECT workflow_task_id, values
      FROM app_form_responses WHERE workflow_task_id IN ($1, $2)`, [newTask, secondTarget]);
    expect(responses.rows).toEqual(expect.arrayContaining([
      { workflow_task_id: newTask, values: { amount: 125, explanation: "Prior assessment" } },
      { workflow_task_id: secondTarget, values: { amount: 250 } },
    ]));
    expect(responses.rows).toHaveLength(2);
  });

  it("retains captured drafts even when the previous task was cancelled", async () => {
    await query("UPDATE app_workflow_tasks SET status = 'CANCELLED' WHERE id = $1", [previousTask]);
    await query(`UPDATE app_form_responses
      SET status = 'DRAFT', completed_at = NULL, definition_snapshot = NULL
      WHERE id = $1`, [previousResponse]);
    await initialize("RETAIN");
    const response = await query(`SELECT status, values FROM app_form_responses
      WHERE workflow_task_id = $1`, [newTask]);
    expect(response.rows).toEqual([{
      status: "DRAFT",
      values: { amount: 125, explanation: "Prior assessment" },
    }]);
  });
});
