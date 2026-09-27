import { sql } from "drizzle-orm";
import { stageTaskDefinitions, workflowTasks } from "@/db/schema";

export const workflowEligibilityActionReady = sql<boolean>`(
  COALESCE(${stageTaskDefinitions.config} ->> 'command', '')
    <> 'AUTHORITATIVE_ELIGIBILITY'
  OR (
    ${workflowTasks.result} ->> 'evaluationId' IS NOT NULL
    AND (
      ${workflowTasks.formVersionId} IS NULL
      OR EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = ${workflowTasks.id}
          AND response.form_version_id = ${workflowTasks.formVersionId}
          AND response.values = (${workflowTasks.result} -> 'evaluatedFormValues')
      )
    )
  )
)`;
