import "server-only";

import { sql, type SQL } from "drizzle-orm";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";

/** Only uploads or explicitly retained evidence linked to this task count. */
export function workflowDocumentEvidenceIsCurrent(
  taskId: SQL,
  evidenceId = sql`evidence.id`,
) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM app_workflow_task_document_evidence task_evidence
    WHERE task_evidence.task_id = ${taskId}
      AND task_evidence.document_version_id = ${evidenceId}
  )`;
}

export function workflowTaskDocumentRequirements(taskId: SQL, definitionId: SQL) {
  return sql<DocumentRequirementItem[]>`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'mandatory', document.mandatory,
      'name', document.name,
      'stableKey', document.stable_key,
      'evidenceUploaded', EXISTS (
        SELECT 1 FROM app_workflow_document_evidence_versions evidence
        WHERE evidence.requirement_id = document.id
          AND ${workflowDocumentEvidenceIsCurrent(taskId)}
      )
    ))
    FROM app_workflow_stage_document_requirements document
    WHERE document.task_definition_id = ${definitionId}
  ), '[]'::jsonb)`;
}
