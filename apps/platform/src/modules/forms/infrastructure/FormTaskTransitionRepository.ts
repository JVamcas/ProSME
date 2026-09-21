import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type FormTaskRuntimeContext = {
  stageDefinitionId: string;
  stageInstanceId: string;
  workflowInstanceId: string;
  workflowVersionId: string;
};

type FormTaskTransition = {
  id: string | null;
  name: string | null;
};

export async function findFormTaskTransition(
  transaction: Transaction,
  task: FormTaskRuntimeContext,
  actionKey: string,
) {
  const result = await transaction.execute(sql`
    SELECT target.id, target.name
    FROM app_workflow_transition_definitions transition
    LEFT JOIN app_workflow_stage_definitions target
      ON target.id = transition.to_stage_id
    WHERE transition.version_id = ${task.workflowVersionId}::uuid
      AND transition.from_stage_id = ${task.stageDefinitionId}::uuid
      AND transition.action_key = ${actionKey}
    ORDER BY transition.priority ASC
    LIMIT 1
  `);
  return result.rows[0] as FormTaskTransition | undefined;
}

async function createNextStage(
  transaction: Transaction,
  task: FormTaskRuntimeContext,
  nextStage: { id: string; name: string },
  startedAt: Date,
) {
  const created = await transaction.execute(sql`
    INSERT INTO app_workflow_stage_instances
      (workflow_instance_id, workflow_stage_definition_id, status, activated_at)
    VALUES (${task.workflowInstanceId}::uuid, ${nextStage.id}::uuid,
      'ACTIVE', ${startedAt})
    RETURNING id
  `);
  const stageId = (created.rows[0] as { id: string }).id;
  await transaction.execute(sql`
    INSERT INTO app_workflow_tasks
      (stage_instance_id, workflow_task_definition_id, type_snapshot,
       form_version_id, status, assigned_role_id, assigned_user_id, due_at)
    SELECT ${stageId}::uuid, definition.id, definition.type,
      binding.form_version_id, 'PENDING', definition.assignment_role_id,
      definition.assignment_user_id,
      CASE WHEN stage.sla_hours IS NULL THEN NULL
        ELSE ${startedAt} + make_interval(hours => stage.sla_hours) END
    FROM app_stage_task_definitions definition
    JOIN app_workflow_stage_definitions stage ON stage.id = definition.stage_id
    LEFT JOIN app_stage_task_form_bindings binding
      ON binding.task_definition_id = definition.id
    WHERE definition.stage_id = ${nextStage.id}::uuid
  `);
  await transaction.execute(sql`
    UPDATE app_workflow_instances
    SET current_stage_instance_id = ${stageId}::uuid
    WHERE id = ${task.workflowInstanceId}::uuid
  `);
  return nextStage.name;
}

export async function advanceFormTaskWorkflow(
  transaction: Transaction,
  task: FormTaskRuntimeContext,
  transition: FormTaskTransition,
  completedAt: Date,
) {
  if (!transition.id) {
    await transaction.execute(sql`
      UPDATE app_workflow_instances
      SET status = 'COMPLETED', completed_at = ${completedAt}
      WHERE id = ${task.workflowInstanceId}::uuid
    `);
    return { nextStageName: null, workflowStatus: "COMPLETED" as const };
  }
  return {
    nextStageName: await createNextStage(
      transaction,
      task,
      { id: transition.id, name: transition.name ?? "Next stage" },
      completedAt,
    ),
    workflowStatus: "ACTIVE" as const,
  };
}
