import "server-only";

import { sql } from "drizzle-orm";

import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

export async function resolveEligibilityTaskFormVersion(
  transaction: Pick<WorkflowInstanceTransaction, "execute">,
  workflowInstanceId: string,
) {
  const result = await transaction.execute<{ formVersionId: string }>(sql`
    SELECT verification.form_version_id AS "formVersionId"
    FROM app_workflow_instances workflow
    JOIN app_applications application
      ON application.id = workflow.application_id
    JOIN app_eligibility_rule_set_verification_forms verification
      ON verification.version_id = application.eligibility_rule_set_version_id
    WHERE workflow.id = ${workflowInstanceId}::uuid
  `);
  return result.rows[0]?.formVersionId ?? null;
}
