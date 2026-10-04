import { randomUUID } from "node:crypto";

import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { initializeWorkflowReworkData } from "@/modules/workflows/infrastructure/WorkflowReworkDataRepository";

export const enabled =
  process.env.RUN_WORKFLOW_REWORK_DATABASE_TESTS === "true";
export const client = enabled
  ? new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3_000,
    })
  : null;
export const dialect = new PgDialect();
export const workflowId = randomUUID();
export const definitionId = randomUUID();
export const formId = randomUUID();
export const oldReviewer = randomUUID();
export const newReviewer = randomUUID();
export const actorId = randomUUID();
export const originalStage = randomUUID();
export const previousStage = randomUUID();
export const currentStage = randomUUID();
export const referringStage = randomUUID();
export const previousTask = randomUUID();
export const newTask = randomUUID();
export const previousResponse = randomUUID();

export async function query(text: string, values: unknown[] = []) {
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
    CREATE TEMP TABLE app_workflow_document_evidence_versions (
      id uuid PRIMARY KEY, requirement_id uuid, version_number integer
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
    app_workflow_task_document_evidence, app_workflow_document_evidence_versions`);
  await query(
    `INSERT INTO app_workflow_stage_instances VALUES
    ($1, $5, $6, 1), ($2, $5, $6, 2), ($3, $5, $6, 4),
    ($4, $5, $7, 3), ($8, $9, $6, 3)`,
    [
      originalStage,
      previousStage,
      currentStage,
      referringStage,
      workflowId,
      definitionId,
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ],
  );
  await query(
    `INSERT INTO app_workflow_tasks
    (id, stage_instance_id, workflow_task_definition_id, reviewer_slot,
     assigned_user_id, form_version_id, result, status) VALUES
    ($1, $3, $5, 1, $6, $8, $9, 'COMPLETED'),
    ($2, $4, $5, 1, $7, $8, NULL, 'PENDING')`,
    [
      previousTask,
      newTask,
      previousStage,
      currentStage,
      definitionId,
      oldReviewer,
      newReviewer,
      formId,
      {
        comments: [{ key: "note", value: "Fix amount" }],
        evaluationId: "old-evaluation",
        formCompleted: true,
        decision: "APPROVE",
      },
    ],
  );
  await query(
    `INSERT INTO app_form_responses
    (id, workflow_task_id, form_version_id, respondent_user_id, status,
     values, created_by, updated_by, completed_at, definition_snapshot)
    VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $4, $4, now(), $6)`,
    [
      previousResponse,
      previousTask,
      formId,
      oldReviewer,
      { amount: 125, explanation: "Prior assessment" },
      { versionId: formId },
    ],
  );
});

afterAll(async () => {
  await client?.end();
});

export async function initialize(dataHandling: "RETAIN" | "CLEAR") {
  await initializeWorkflowReworkData(
    {
      execute: async (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
        const compiled = dialect.sqlToQuery(statement);
        return query(compiled.sql, compiled.params);
      },
    } as never,
    {
      actorId,
      correlationId: randomUUID(),
      dataHandling,
      stageInstanceId: currentStage,
    },
  );
}
