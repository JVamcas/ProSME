import "server-only";

import { eq, sql } from "drizzle-orm";
import { stageTaskDefinitions, workflowTasks } from "@/db/schema";
import {
  taskRunsAuthoritativeEligibility,
  taskWorkIsReady,
} from "../WorkflowTaskRegistry";
import type { StageCompletionTransaction } from "./StageCompletionRepository";
import { workflowTaskDocumentRequirements } from "./WorkflowDocumentEvidenceReadiness";

export async function readWorkflowActionTaskReadiness(
  database: Pick<StageCompletionTransaction, "select">,
  taskId: string,
  previewFormSubmission = false,
) {
  const [work] = await database
    .select({
      hasOpenRfi: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_rfis rfi
        WHERE rfi.task_id = ${workflowTasks.id}
          AND rfi.status = 'OPEN'
      )`,
      config: stageTaskDefinitions.config,
      documentRequirements: workflowTaskDocumentRequirements(
        sql`${workflowTasks.id}`,
        sql`${stageTaskDefinitions.id}`,
      ),
      taskType: stageTaskDefinitions.taskType,
      formCompleted: sql<boolean>`(
        ${workflowTasks.formVersionId} IS NOT NULL AND EXISTS (
          SELECT 1 FROM app_form_responses response
          WHERE response.workflow_task_id = ${workflowTasks.id}
            AND (response.status = 'COMPLETED'
              OR (
                (${stageTaskDefinitions.config} ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
                  OR ${stageTaskDefinitions.config} ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION')
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
  // Decision selection precedes form finalization. Execution uses the default
  // strict check after the form has been validated and submitted on the server.
  const submitsFormWithDecision = Boolean(
    previewFormSubmission &&
    work?.taskType === "STAGE_DECISION" &&
    !taskRunsAuthoritativeEligibility(work.config),
  );
  return {
    hasOpenRfi: work?.hasOpenRfi ?? false,
    workReady: Boolean(
      work && taskWorkIsReady({
        ...work,
        formCompleted: work.formCompleted || submitsFormWithDecision,
      }),
    ),
  };
}
