import "server-only";

import { sql } from "drizzle-orm";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

type Executor = Pick<WorkflowActionExecutionTransaction, "execute">;

// Lock the parent before any stage/task write, so application holds and work
// in parallel branches have a single transaction ordering point.
export async function lockWorkflowRuntimeForStage(executor: Executor, stageId: string) {
  await executor.execute(sql`
    SELECT workflow.id FROM app_workflow_instances workflow
    JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id
    WHERE stage.id = ${stageId}::uuid FOR UPDATE OF workflow
  `);
}

export async function lockWorkflowRuntimeForTask(executor: Executor, taskId: string) {
  await executor.execute(sql`
    SELECT workflow.id FROM app_workflow_instances workflow
    JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id
    JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
    WHERE task.id = ${taskId}::uuid FOR UPDATE OF workflow
  `);
}
