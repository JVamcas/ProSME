import { randomUUID } from "node:crypto";

import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readWorkflowControlDestinations } from "@/modules/workflows/infrastructure/WorkflowControlDestinationRepository";

const enabled = process.env.RUN_WORKFLOW_DESTINATION_DATABASE_TESTS === "true";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
});
const dialect = new PgDialect();
const workflow = randomUUID();
const version = randomUUID();
const source = randomUUID();
const sourceDefinition = randomUUID();
const previous = randomUUID();
const upstreamUnvisited = randomUUID();
const future = randomUUID();
const unrelated = randomUUID();

beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  await client.query(`
    CREATE TEMP TABLE app_workflow_instances (id uuid, workflow_template_version_id uuid, status text);
    CREATE TEMP TABLE app_workflow_stage_definitions (id uuid, version_id uuid, name text, code text, enabled boolean, sequence integer);
    CREATE TEMP TABLE app_workflow_stage_instances (id uuid, workflow_instance_id uuid, workflow_stage_definition_id uuid, status text, activated_at timestamptz);
    CREATE TEMP TABLE app_stage_task_definitions (stage_id uuid);
    CREATE TEMP TABLE app_workflow_transition_definitions (id uuid, version_id uuid, from_stage_id uuid, action_key text);
    CREATE TEMP TABLE app_workflow_transition_targets (transition_id uuid, target_stage_id uuid);
    CREATE TEMP TABLE app_workflow_action_definitions (stage_id uuid, stable_key text, action_type text);
  `);
  await client.query(
    "INSERT INTO app_workflow_instances VALUES ($1, $2, 'ACTIVE')",
    [workflow, version],
  );
  await client.query(
    `INSERT INTO app_workflow_stage_definitions VALUES
      ($1, $6, 'Current', 'CURRENT', TRUE, 3),
      ($2, $6, 'Previous', 'PREVIOUS', TRUE, 2),
      ($3, $6, 'Upstream unvisited', 'UPSTREAM_UNVISITED', TRUE, 9),
      ($4, $6, 'Future', 'FUTURE', TRUE, 4),
      ($5, $6, 'Unrelated', 'UNRELATED', TRUE, 1)`,
    [sourceDefinition, previous, upstreamUnvisited, future, unrelated, version],
  );
  await client.query(
    "INSERT INTO app_stage_task_definitions VALUES ($1), ($2), ($3), ($4), ($5)",
    [sourceDefinition, previous, upstreamUnvisited, future, unrelated],
  );
  await client.query(
    `INSERT INTO app_workflow_stage_instances VALUES
      ($1, $2, $3, 'ACTIVE', '2026-10-03'),
      ($4, $2, $5, 'COMPLETED', '2026-10-01')`,
    [source, workflow, sourceDefinition, randomUUID(), previous],
  );
  for (const [from, to] of [
    [upstreamUnvisited, previous],
    [previous, sourceDefinition],
    [sourceDefinition, future],
  ]) {
    const transition = randomUUID();
    await client.query(
      "INSERT INTO app_workflow_action_definitions VALUES ($1, 'ADVANCE', 'APPROVE_ADVANCE')",
      [from],
    );
    await client.query(
      "INSERT INTO app_workflow_transition_definitions VALUES ($1, $2, $3, 'ADVANCE')",
      [transition, version, from],
    );
    await client.query(
      "INSERT INTO app_workflow_transition_targets VALUES ($1, $2)",
      [transition, to],
    );
  }
});

afterAll(async () => {
  if (enabled) await client.end();
});

async function destinations(targetStageDefinitionId?: string) {
  return readWorkflowControlDestinations(
    {
      execute: async (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
        const compiled = dialect.sqlToQuery(statement);
        return client.query(compiled.sql, compiled.params);
      },
    } as never,
    {
      actionType: "RETURN",
      sourceStageInstanceId: source,
      workflowInstanceId: workflow,
      targetStageDefinitionId,
    },
  );
}

(enabled ? describe : describe.skip)("Return destination SQL", () => {
  it("offers only the completed immediate previous stage", async () => {
    expect(await destinations()).toEqual([
      { id: previous, name: "Previous", stableKey: "PREVIOUS" },
    ]);
  });

  it("requires completion history in addition to an upstream path", async () => {
    expect(await destinations(upstreamUnvisited)).toEqual([]);
  });

  it("rejects an older completed ancestor even when it is in the application's history", async () => {
    const oldInstance = randomUUID();
    await client.query(
      "INSERT INTO app_workflow_stage_instances VALUES ($1, $2, $3, 'COMPLETED', '2026-09-28')",
      [oldInstance, workflow, upstreamUnvisited],
    );
    try {
      expect(await destinations(upstreamUnvisited)).toEqual([]);
      expect(await destinations()).toEqual([
        { id: previous, name: "Previous", stableKey: "PREVIOUS" },
      ]);
    } finally {
      await client.query(
        "DELETE FROM app_workflow_stage_instances WHERE id = $1",
        [oldInstance],
      );
    }
  });

  it("rejects downstream, unrelated and current stages", async () => {
    for (const id of [future, unrelated, sourceDefinition]) {
      expect(await destinations(id)).toEqual([]);
    }
  });

  it("does not use display sequence as evidence of an earlier stage", async () => {
    await client.query(
      "UPDATE app_workflow_stage_definitions SET sequence = 1 WHERE id = $1",
      [future],
    );
    expect(await destinations(future)).toEqual([]);
  });

  it("excludes a target with an active rework iteration", async () => {
    const active = randomUUID();
    await client.query(
      "INSERT INTO app_workflow_stage_instances VALUES ($1, $2, $3, 'BLOCKED', '2026-10-02')",
      [active, workflow, previous],
    );
    try {
      expect(await destinations(previous)).toEqual([]);
    } finally {
      await client.query(
        "DELETE FROM app_workflow_stage_instances WHERE id = $1",
        [active],
      );
    }
  });

  it("returns no targets once the workflow is inactive", async () => {
    await client.query(
      "UPDATE app_workflow_instances SET status = 'COMPLETED' WHERE id = $1",
      [workflow],
    );
    expect(await destinations()).toEqual([]);
  });
});
