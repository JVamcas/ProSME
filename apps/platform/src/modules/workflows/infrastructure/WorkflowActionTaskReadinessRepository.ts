import "server-only";

import { eq, sql } from "drizzle-orm";
import { stageTaskDefinitions, workflowTasks } from "@/db/schema";
import { taskWorkIsReady } from "../WorkflowTaskRegistry";
import type { StageCompletionTransaction } from "./StageCompletionRepository";

export async function readWorkflowActionTaskReadiness(
  database: Pick<StageCompletionTransaction, "select">,
  taskId: string,
) {
  const [work] = await database
    .select({
      hasOpenRfi: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_rfis rfi
        WHERE rfi.task_id = ${workflowTasks.id}
          AND rfi.status = 'OPEN'
      )`,
      config: stageTaskDefinitions.config,
      formCompleted: sql<boolean>`(
        ${workflowTasks.formVersionId} IS NOT NULL AND EXISTS (
          SELECT 1 FROM app_form_responses response
          WHERE response.workflow_task_id = ${workflowTasks.id}
            AND (response.status = 'COMPLETED'
              OR (
                ${stageTaskDefinitions.config} ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
                AND response.values = (${workflowTasks.result} -> 'evaluatedFormValues')
              ))
        )
      )`,
      formRequired: sql<boolean>`${workflowTasks.formVersionId} IS NOT NULL`,
      hasChecklist: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_stage_checklist_definitions checklist
        WHERE checklist.task_definition_id = ${stageTaskDefinitions.id}
      )`,
      result: workflowTasks.result,
    })
    .from(workflowTasks)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .where(eq(workflowTasks.id, taskId))
    .limit(1);
  return {
    hasOpenRfi: work?.hasOpenRfi ?? false,
    workReady: Boolean(work && taskWorkIsReady(work)),
  };
}
