import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";

export async function deleteWorkflowVersionGraphs(
  transaction: DatabaseTransaction,
  versionIds: string[],
) {
  if (!versionIds.length) return;
  const versions = sql.join(
    versionIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const stages = sql`
    SELECT id FROM app_workflow_stage_definitions WHERE version_id IN (${versions})
  `;
  const tasks = sql`
    SELECT id FROM app_stage_task_definitions WHERE stage_id IN (${stages})
  `;
  const transitions = sql`
    SELECT id FROM app_workflow_transition_definitions WHERE version_id IN (${versions})
  `;
  await transaction.execute(sql`
    DELETE FROM app_workflow_transition_targets WHERE transition_id IN (${transitions})
  `);
  await transaction.execute(sql`
    DELETE FROM app_workflow_stage_join_predecessors WHERE stage_id IN (${stages})
  `);
  await transaction.execute(sql`
    DELETE FROM app_workflow_transition_definitions WHERE version_id IN (${versions})
  `);
  await transaction.execute(sql`
    DELETE FROM app_stage_task_form_bindings WHERE task_definition_id IN (${tasks})
  `);
  // Foreign-key dependencies require children to be deleted before tasks/stages.
  for (const table of [
    "app_stage_task_action_bindings",
    "app_workflow_stage_comment_fields",
    "app_workflow_stage_scoring_criteria",
    "app_workflow_stage_scoring_configurations",
    "app_workflow_stage_checklist_definitions",
    "app_workflow_stage_document_requirements",
    "app_workflow_action_definitions",
    "app_stage_task_definitions",
  ]) {
    await transaction.execute(sql`
      DELETE FROM ${sql.identifier(table)} WHERE stage_id IN (${stages})
    `);
  }
  await transaction.execute(sql`
    DELETE FROM app_workflow_stage_definitions WHERE version_id IN (${versions})
  `);
}
