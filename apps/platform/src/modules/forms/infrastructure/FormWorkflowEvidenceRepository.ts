import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { FormField } from "../FormTypes";
import { workflowDocumentEvidenceIsCurrent } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceReadiness";

// Called only after task/form authorization. Never trust document IDs submitted by a browser.
export async function resolveFormEvidenceValues(
  taskId: string,
  fields: readonly FormField[],
  values: Record<string, unknown>,
) {
  const documents = fields.filter(
    (field) =>
      field.type === "DOCUMENT" && (field.workflowDocument || field.uploadedBy),
  );
  if (!documents.length) return values;
  const records = await getDatabase().execute<{ key: string; id: string }>(sql`
    SELECT requirement.stable_key AS key, evidence.id
    FROM app_workflow_tasks task
    JOIN app_workflow_stage_document_requirements requirement
      ON requirement.task_definition_id = task.workflow_task_definition_id
    JOIN app_workflow_document_evidence_versions evidence
      ON evidence.requirement_id = requirement.id
    WHERE task.id = ${taskId}::uuid
      AND ${workflowDocumentEvidenceIsCurrent(sql`task.id`)}
  `);
  const byKey = new Map(records.rows.map((row) => [row.key, row.id]));
  const result = { ...values };
  for (const field of documents) {
    delete result[field.key];
    const id = byKey.get(field.workflowDocument?.stableKey ?? field.key);
    if (id) result[field.key] = id;
  }
  return result;
}
