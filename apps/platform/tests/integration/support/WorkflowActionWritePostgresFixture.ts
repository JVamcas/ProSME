import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/modules/workflows/infrastructure/workflow.schema";
import { workflowTransitionTargets } from "@/modules/workflows/infrastructure/workflow-parallel.schema";
import { workflowAuditEntries } from "@/modules/workflows/infrastructure/workflow-audit.schema";
import {
  workflowActionSaveInput,
  workflowActionSaveRecord,
} from "../../support/WorkflowActionSaveFixture";

export const enabled = process.env.RUN_ACTION_WRITE_DATABASE_TESTS === "true";
export const client = enabled
  ? new Client({ connectionString: process.env.DATABASE_URL })
  : null;
export const queries: string[] = [];
export let record = workflowActionSaveRecord();
const tables = [
  workflowDefinitionVersions,
  workflowStageDefinitions,
  stageTaskDefinitions,
  workflowActionDefinitions,
  stageTaskActionBindings,
  workflowTransitionDefinitions,
  workflowTransitionTargets,
  workflowAuditEntries,
];

function createTable(table: PgTable) {
  const columns = Object.values(getTableColumns(table)).map((column) => {
    const suffix =
      column.name === "id"
        ? " PRIMARY KEY DEFAULT gen_random_uuid()"
        : column.name === "created_at"
          ? " DEFAULT now()"
          : "";
    return `"${column.name}" ${column.getSQLType()}${suffix}`;
  });
  return `CREATE TEMP TABLE ${getTableName(table)} (${columns.join(", ")})`;
}

beforeAll(async () => {
  if (!client) return;
  await client.connect();
  for (const table of tables) await client.query(createTable(table));
  await client.query(`
    ALTER TABLE app_workflow_action_definitions ADD UNIQUE(stage_id, stable_key), ADD UNIQUE(stage_id, display_order);
    ALTER TABLE app_stage_task_definitions ADD UNIQUE(id, stage_id);
    ALTER TABLE app_stage_task_action_bindings ADD UNIQUE(task_definition_id, action_key),
      ADD FOREIGN KEY(stage_id, action_key) REFERENCES app_workflow_action_definitions(stage_id, stable_key) ON DELETE RESTRICT,
      ADD FOREIGN KEY(task_definition_id, stage_id) REFERENCES app_stage_task_definitions(id, stage_id) ON DELETE RESTRICT;
    ALTER TABLE app_workflow_transition_definitions ADD UNIQUE(version_id, from_stage_id, action_key, priority),
      ADD FOREIGN KEY(from_stage_id, action_key) REFERENCES app_workflow_action_definitions(stage_id, stable_key) ON DELETE RESTRICT;
    ALTER TABLE app_workflow_transition_targets ADD PRIMARY KEY(transition_id, target_stage_id),
      ADD FOREIGN KEY(transition_id) REFERENCES app_workflow_transition_definitions(id) ON DELETE RESTRICT,
      ADD FOREIGN KEY(target_stage_id) REFERENCES app_workflow_stage_definitions(id) ON DELETE RESTRICT;
  `);
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(client, {
      logger: { logQuery: (query) => queries.push(query) },
    }) as ReturnType<typeof getDatabase>,
  );
});
afterAll(async () => {
  await client?.end();
});
beforeEach(async () => {
  if (!client) return;
  record = workflowActionSaveRecord();
  await client.query(`TRUNCATE ${tables.map(getTableName).join(", ")}`);
  await client.query(
    "INSERT INTO app_workflow_definition_versions (id,definition_id,status,row_version) VALUES ($1,$2,'DRAFT',7)",
    [record.version.id, record.definition.id],
  );
  const stageRows = record.graph.stages.map((stage) => ({
    id: stage.id,
    version_id: record.version.id,
  }));
  await client.query(
    "INSERT INTO app_workflow_stage_definitions (id,version_id) SELECT id,version_id FROM jsonb_to_recordset($1) AS row(id uuid,version_id uuid)",
    [JSON.stringify(stageRows)],
  );
  const database = getDatabase();
  await database.insert(stageTaskDefinitions).values(
    record.graph.stages.flatMap((stage) =>
      stage.tasks.map((task) => ({
        id: task.id,
        stageId: stage.id!,
        stableKey: task.stableKey,
        name: task.name,
        displayOrder: task.displayOrder,
        taskType: task.taskType,
        permissions: task.permissions,
      })),
    ),
  );
  await database
    .insert(workflowActionDefinitions)
    .values(
      record.graph.stages.flatMap((stage) =>
        stage.actions.map((action) => ({ ...action, stageId: stage.id! })),
      ),
    );
  await database.insert(stageTaskActionBindings).values(
    record.graph.stages.flatMap((stage) =>
      stage.tasks.flatMap((task) =>
        task.actionKeys.map((actionKey) => ({
          taskDefinitionId: task.id!,
          stageId: stage.id!,
          actionKey,
        })),
      ),
    ),
  );
  const stageIds = new Map(
    record.graph.stages.map((stage) => [stage.stableKey, stage.id!]),
  );
  await database.insert(workflowTransitionDefinitions).values(
    record.graph.transitions.map((route) => ({
      id: route.id,
      versionId: record.version.id,
      fromStageId: stageIds.get(route.sourceStageKey)!,
      actionKey: route.actionKey,
      priority: route.priority,
      condition: route.condition,
      terminalOutcome: route.terminalOutcome ?? null,
    })),
  );
  const targets = record.graph.transitions.flatMap((route) =>
    route.targetStageKeys.map((key) => ({
      transitionId: route.id!,
      targetStageId: stageIds.get(key)!,
    })),
  );
  await database.insert(workflowTransitionTargets).values(targets);
  queries.length = 0;
});

export function input() {
  const change = workflowActionSaveInput(record);
  const stage = record.graph.stages[0];
  return {
    ...change,
    actorId: randomUUID(),
    correlationId: randomUUID(),
    definitionId: record.definition.id,
    stage,
    previous: stage.actions[0],
    taskIds: stage.tasks.map((task) => task.id!),
    bindingsChanged: false,
    previousRoutes: change.routes,
    stageIds: new Map(
      record.graph.stages.map((item) => [item.stableKey, item.id!]),
    ),
  };
}
export async function snapshot() {
  const result: Record<string, unknown> = {};
  for (const table of tables) {
    const name = getTableName(table);
    result[name] = (
      await client!.query(
        `SELECT to_jsonb(row) AS value FROM ${name} row ORDER BY to_jsonb(row)::text`,
      )
    ).rows;
  }
  return result;
}
