import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { WorkflowEligibilityFormPreview } from "../api/WorkflowEligibilityFormPreview";

export async function readWorkflowEligibilityFormPreviews(
  definitionId: string,
  versionId: string,
): Promise<WorkflowEligibilityFormPreview[] | null> {
  const result = await getDatabase()
    .execute<WorkflowEligibilityFormPreview>(sql`
    WITH contexts AS (
      SELECT call.id, call.title, call.workflow_template_version_id,
        call.eligibility_rule_set_version_id
      FROM app_funding_calls call
      WHERE NOT EXISTS (
        SELECT 1 FROM app_funding_call_draft_versions draft
        WHERE draft.funding_call_id = call.id
          AND draft.snapshot->>'workflowTemplateVersionId' = ${versionId}
      )
      UNION ALL
      SELECT draft.funding_call_id, draft.snapshot->>'title',
        (draft.snapshot->>'workflowTemplateVersionId')::uuid,
        (draft.snapshot->>'eligibilityRuleSetVersionId')::uuid
      FROM app_funding_call_draft_versions draft
    )
    SELECT call.id AS "fundingCallId", call.title AS "fundingCallTitle",
      call.eligibility_rule_set_version_id AS "eligibilityRuleSetVersionId",
      form_version.id AS "formVersionId",
      coalesce(form_version.metadata->>'name', form_definition.name) AS "formName"
    FROM app_workflow_definition_versions workflow_version
    LEFT JOIN contexts call
      ON call.workflow_template_version_id = workflow_version.id
    LEFT JOIN app_eligibility_rule_set_versions rules_version
      ON rules_version.id = call.eligibility_rule_set_version_id
      AND rules_version.status = 'PUBLISHED'
    LEFT JOIN app_eligibility_rule_set_verification_forms verification
      ON verification.version_id = rules_version.id
    LEFT JOIN app_form_versions form_version
      ON form_version.id = verification.form_version_id
      AND form_version.status = 'PUBLISHED'
    LEFT JOIN app_form_definitions form_definition
      ON form_definition.id = form_version.form_definition_id
    WHERE workflow_version.id = ${versionId}::uuid
      AND workflow_version.definition_id = ${definitionId}::uuid
    ORDER BY call.title, call.id
  `);
  if (!result.rows.length) return null;
  return result.rows.filter((row) => row.fundingCallId !== null);
}
