import "server-only";

import { sql, type SQL } from "drizzle-orm";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";

/** Current document version shared by reviewers of one task definition and run. */
export function workflowDocumentEvidenceIsCurrent(
  taskId: SQL,
  evidenceId = sql`evidence.id`,
) {
  return sql<boolean>`EXISTS (
    SELECT 1
    FROM app_workflow_tasks document_target
    JOIN app_workflow_tasks document_owner
      ON document_owner.stage_instance_id = document_target.stage_instance_id
      AND document_owner.workflow_task_definition_id = document_target.workflow_task_definition_id
    JOIN app_workflow_task_document_evidence task_evidence
      ON task_evidence.task_id = document_owner.id
    JOIN app_workflow_document_evidence_versions candidate
      ON candidate.id = task_evidence.document_version_id
    WHERE document_target.id = ${taskId}
      AND task_evidence.document_version_id = ${evidenceId}
      AND NOT EXISTS (
        SELECT 1
        FROM app_workflow_tasks newer_owner
        JOIN app_workflow_task_document_evidence newer_link
          ON newer_link.task_id = newer_owner.id
        JOIN app_workflow_document_evidence_versions newer_version
          ON newer_version.id = newer_link.document_version_id
        WHERE newer_owner.stage_instance_id = document_target.stage_instance_id
          AND newer_owner.workflow_task_definition_id = document_target.workflow_task_definition_id
          AND newer_version.requirement_id = candidate.requirement_id
          AND newer_version.version_number > candidate.version_number
      )
  )`;
}

export function workflowTaskDocumentRequirements(
  taskId: SQL,
  definitionId: SQL,
) {
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
