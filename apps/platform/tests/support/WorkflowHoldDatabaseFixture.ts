import { readAdminApplications } from "@/modules/applications/infrastructure/AdminApplicationRepository";
import { readWorkflowProgress } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";
import type { PoolClient } from "pg";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { startWorkflowHold } from "@/modules/workflows/infrastructure/WorkflowHoldRepository";
import { workflowTaskHasActiveHold } from "@/modules/workflows/infrastructure/WorkflowHoldQueries";
import type { WorkflowHoldScope } from "@/modules/workflows/domain/runtime/WorkflowHold";
import { formContextIds as id } from "./WorkflowEligibilityFormContextFixture";
import { deadlineFixtureIds as extra } from "./WorkflowDeadlineFixture";

export async function insertWorkflowTestHold(
  client: PoolClient,
  scope: WorkflowHoldScope,
  reviewAt?: Date,
) {
  const executionId = crypto.randomUUID();
  await client.query(
    `INSERT INTO app_workflow_action_executions
    (id, action_key, action_type, actor_type, actor_id, actor_identifier,
     workflow_instance_id, source_stage_instance_id, task_id, normalized_input,
     condition_evaluation, expected_runtime_version, resulting_runtime_version,
     result, idempotency_key, correlation_id)
    SELECT $1::uuid, action_key, action_type, actor_type, actor_id, actor_identifier,
      workflow_instance_id, source_stage_instance_id, task_id, normalized_input,
      condition_evaluation, expected_runtime_version, resulting_runtime_version,
      result, $1::uuid::text, correlation_id
    FROM app_workflow_action_executions WHERE id = $2`,
    [executionId, extra.actionExecution],
  );
  return startWorkflowHold(getDatabase() as never, {
    actionExecutionId: executionId,
    actorId: id.actor,
    correlationId: crypto.randomUUID(),
    reason: "Await evidence",
    scope,
    stageInstanceId: id.stageInstance,
    taskId: id.unboundTask,
    workflowInstanceId: id.workflow,
    reviewAt,
  });
}

export async function readHeldWorkflowTestTasks(parallelTask: string) {
  const result = await getDatabase().execute<{ id: string }>(sql`
    SELECT task.id FROM app_workflow_tasks task
    WHERE task.id IN (${id.unboundTask}::uuid, ${id.commandTask}::uuid, ${parallelTask}::uuid)
      AND ${workflowTaskHasActiveHold(sql`task`)}
    ORDER BY task.id
  `);
  return result.rows.map((row) => row.id).sort();
}

export async function installWorkflowHoldBusiness(client: PoolClient) {
  const businessId = crypto.randomUUID();
  await client.query(
    `INSERT INTO app_business_profiles
    (id, user_id, legal_name, registration_number, business_type, sector,
     region, physical_address, established_year, employee_count)
    VALUES ($1, $2, 'Hold Test Business', 'HOLD-123', 'cc', 'services',
      'Khomas', 'Test address', 2024, 3)`,
    [businessId, id.actor],
  );
  return businessId;
}
export async function installWorkflowHoldParallelBranch(client: PoolClient) {
  const parallelStage = crypto.randomUUID();
  const parallelTask = crypto.randomUUID();
  await client.query(
    `INSERT INTO app_workflow_stage_instances
        (id, workflow_instance_id, workflow_stage_definition_id, activated_at)
       VALUES ($1, $2, $3, now())`,
    [parallelStage, id.workflow, extra.reworkStage],
  );
  await client.query(
    `INSERT INTO app_workflow_tasks
        (id, stage_instance_id, workflow_task_definition_id, assigned_user_id)
       VALUES ($1, $2, $3, $4)`,
    [parallelTask, parallelStage, extra.reworkTask, id.otherActor],
  );
  await client.query(
    "UPDATE app_workflow_instances SET current_stage_instance_id = $2 WHERE id = $1",
    [id.workflow, id.stageInstance],
  );
  return { parallelStage, parallelTask };
}

export async function readHoldStaffProjections() {
  const [progress, applications] = await Promise.all([
    readWorkflowProgress(id.application),
    readAdminApplications({
      actorId: id.actor,
      visibility: "all",
      filters: { status: "all", limit: 10 },
    }),
  ]);
  return {
    progress,
    staffApplication: applications.items.find(
      (item) => item.applicationId === id.application,
    )!,
  };
}
