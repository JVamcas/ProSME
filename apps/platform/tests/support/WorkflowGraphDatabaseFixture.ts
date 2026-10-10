import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, vi } from "vitest";
import { getDatabase } from "@/db/client";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { referenceWorkflow } from "./ReferenceWorkflowFixture";

export const enabled = process.env.RUN_WORKFLOW_GRAPH_DATABASE_TESTS === "true";
export const actorId = randomUUID();
const schemaName = `workflow_graph_${randomUUID().replaceAll("-", "")}`;
const connectionString = process.env.DATABASE_URL;
const provision = enabled ? new pg.Pool({ connectionString }) : null;
export const pool = enabled
  ? new pg.Pool({ connectionString, options: `-c search_path=${schemaName}` })
  : null;
let created = false;
export const executedQueries: string[] = [];

beforeAll(async () => {
  if (!pool || !provision) return;
  await provision.query(`CREATE SCHEMA ${schemaName}`);
  created = true;
  const tables = [
    "app_users",
    "app_roles",
    "app_form_definitions",
    "app_form_versions",
    "app_form_fields",
    "app_workflow_definitions",
    "app_workflow_definition_versions",
    "app_workflow_stage_definitions",
    "app_workflow_action_definitions",
    "app_stage_task_definitions",
    "app_stage_task_form_bindings",
    "app_stage_task_action_bindings",
    "app_workflow_transition_definitions",
    "app_workflow_transition_targets",
    "app_workflow_stage_join_predecessors",
    "app_workflow_stage_checklist_definitions",
    "app_workflow_stage_comment_fields",
    "app_workflow_stage_document_requirements",
    "app_workflow_stage_scoring_configurations",
    "app_workflow_stage_scoring_criteria",
    "app_workflow_audit_entries",
    "app_workflow_instances",
    "app_funding_opportunity_workflows",
  ];
  for (const table of tables) {
    await pool.query(
      `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
    );
  }
  // LIKE omits foreign keys and triggers. Restore the restrictive dependencies
  // exercised by deletion and the deployed lifecycle/immutability functions.
  await pool.query(`
    ALTER TABLE app_workflow_definition_versions ADD COLUMN IF NOT EXISTS source_version_id uuid;
    ALTER TABLE app_form_versions ADD COLUMN IF NOT EXISTS source_version_id uuid;
    ALTER TABLE app_stage_task_action_bindings ADD FOREIGN KEY (stage_id, action_key)
      REFERENCES app_workflow_action_definitions(stage_id, stable_key) ON DELETE RESTRICT;
    ALTER TABLE app_workflow_transition_definitions ADD FOREIGN KEY (from_stage_id, action_key)
      REFERENCES app_workflow_action_definitions(stage_id, stable_key) ON DELETE RESTRICT;
    ALTER TABLE app_workflow_transition_targets ADD FOREIGN KEY (transition_id)
      REFERENCES app_workflow_transition_definitions(id) ON DELETE RESTRICT;
    ALTER TABLE app_stage_task_form_bindings ADD FOREIGN KEY (task_definition_id)
      REFERENCES app_stage_task_definitions(id) ON DELETE RESTRICT;
  `);
  for (const name of [
    "workflow_version_has_instances",
    "require_mutable_workflow_version",
    "prevent_immutable_workflow_child_mutation",
    "protect_workflow_version_lifecycle",
  ]) {
    const definition = await pool.query(
      "SELECT pg_get_functiondef(oid) AS definition FROM pg_proc WHERE proname=$1 AND pronamespace='public'::regnamespace",
      [name],
    );
    await pool.query(
      definition.rows[0].definition.replace("FUNCTION public.", "FUNCTION "),
    );
  }
  await pool.query(`
    CREATE TRIGGER workflow_version_guard BEFORE INSERT OR UPDATE OR DELETE
      ON app_workflow_definition_versions FOR EACH ROW EXECUTE FUNCTION protect_workflow_version_lifecycle();
    CREATE TRIGGER workflow_action_guard BEFORE INSERT OR UPDATE OR DELETE
      ON app_workflow_action_definitions FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
    CREATE TRIGGER workflow_stage_guard BEFORE INSERT OR UPDATE OR DELETE
      ON app_workflow_stage_definitions FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
    CREATE TRIGGER workflow_task_guard BEFORE INSERT OR UPDATE OR DELETE
      ON app_stage_task_definitions FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
    CREATE TRIGGER workflow_route_guard BEFORE INSERT OR UPDATE OR DELETE
      ON app_workflow_transition_definitions FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
  `);
  await pool.query(
    "INSERT INTO app_users (id,email,display_name) VALUES ($1,$2,'Synthetic workflow administrator')",
    [actorId, `${actorId}@example.test`],
  );
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(pool, {
      logger: { logQuery: (query) => executedQueries.push(query) },
    }) as ReturnType<typeof getDatabase>,
  );
}, 60000);

afterAll(async () => {
  await pool?.end();
  try {
    if (created) await provision?.query(`DROP SCHEMA ${schemaName} CASCADE`);
  } finally {
    await provision?.end();
  }
});

export async function createGraphFixture() {
  const graph = structuredClone(referenceWorkflow);
  const formId = randomUUID();
  const formVersionId = randomUUID();
  await pool!.query(
    "INSERT INTO app_form_definitions (id,code,name,purpose,created_by) VALUES ($1::uuid,$1::text,'Synthetic review','APPLICATION_REVIEW',$2)",
    [formId, actorId],
  );
  await pool!.query(
    "INSERT INTO app_form_versions (id,form_definition_id,version_number,status,created_by) VALUES ($1,$2,1,'PUBLISHED',$3)",
    [formVersionId, formId, actorId],
  );
  graph.stages[0].tasks[0].formBinding = {
    formVersionId,
    contextFields: [
      { key: "application.reference", label: "Reference", type: "TEXT" },
    ],
  };

  graph.stages[0].actions.push(
    { ...graph.stages[0].actions[0], stableKey: "KEEP_FIRST", displayOrder: 2 },
    { ...graph.stages[0].actions[0], stableKey: "KEEP_LAST", displayOrder: 3 },
  );
  graph.stages[0].tasks[0].actionKeys.push("KEEP_FIRST", "KEEP_LAST");
  graph.transitions.push({
    ...graph.transitions[0],
    priority: 2,
    targetStageKeys: [graph.stages[1].stableKey, graph.stages[2].stableKey],
  });
  graph.stages[2].joinPredecessorStageKeys = [
    graph.stages[0].stableKey,
    graph.stages[1].stableKey,
  ];
  const versionId = await createWorkflowDefinition({
    actorId,
    correlationId: randomUUID(),
    code: `SYNTHETIC_${randomUUID()}`,
    name: "Synthetic graph",
    description: "Synthetic configuration",
    graph,
  });
  const stored = (await findWorkflowGraph(versionId))!;
  return { graph, stored, versionId, definitionId: stored.definition.id };
}

export function deletionInput(
  fixture: Awaited<ReturnType<typeof createGraphFixture>>,
) {
  return {
    actorId,
    correlationId: randomUUID(),
    definitionId: fixture.definitionId,
    versionId: fixture.versionId,
    expectedRowVersion: 1,
    stageKey: fixture.graph.stages[0].stableKey,
    actionKey: "ADVANCE",
  };
}
