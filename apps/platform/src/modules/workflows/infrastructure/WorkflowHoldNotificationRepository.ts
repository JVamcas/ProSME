import "server-only";

import { sql } from "drizzle-orm";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import type { WorkflowHoldScope } from "../domain/runtime/WorkflowHold";
import { workflowHoldAffectsTask } from "./WorkflowHoldQueries";

export async function loadWorkflowHoldNotification(
  transaction: WorkflowActionExecutionTransaction,
  holdId: string,
) {
  const result = await transaction.execute<{
    holder: { userId: string; displayName: string; email: string };
    scope: WorkflowHoldScope;
    processingStillHeld: boolean;
  }>(sql`
    SELECT jsonb_build_object('userId', holder.id, 'displayName', holder.display_name,
      'email', holder.email) AS holder, ended.scope,
      EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
        JOIN app_workflow_holds remaining ON ${workflowHoldAffectsTask(sql`remaining`, sql`task`)}
        WHERE stage.workflow_instance_id = ended.workflow_instance_id
          AND task.status IN ('PENDING', 'IN_PROGRESS')
          AND remaining.status = 'ACTIVE'
          AND ${workflowHoldAffectsTask(sql`ended`, sql`task`)}
      ) AS "processingStillHeld"
    FROM app_workflow_holds ended
    JOIN app_users holder ON holder.id = ended.held_by
    WHERE ended.id = ${holdId}::uuid AND ended.status = 'RESUMED'
  `);
  if (!result.rows[0])
    throw new Error("The hold notification context is unavailable.");
  return result.rows[0];
}
