import "server-only";

import { sql } from "drizzle-orm";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowRfiDetailedResponseFieldPath } from "../domain/runtime/WorkflowRfi";
import {
  isWorkflowRfiEditableField,
  type WorkflowRfiFieldOption,
} from "../domain/runtime/WorkflowRfiFields";
import { ResourceConflictError } from "@/lib/resource-errors";

export async function readWorkflowRfiFieldOptions(
  executor: Pick<WorkflowActionExecutionTransaction, "execute">,
  applicationId: string,
  allowedPaths: readonly string[],
): Promise<WorkflowRfiFieldOption[]> {
  const paths = allowedPaths.filter(
    (path) => path !== workflowRfiDetailedResponseFieldPath,
  );
  const result = paths.length
    ? await executor.execute<{
        key: string;
        label: string;
        type: "TEXT" | "DOCUMENT";
      }>(sql`
    SELECT field.key, field.label, field.type
    FROM app_applications application
    JOIN app_form_fields field ON field.form_version_id = application.form_version_id
    JOIN app_form_sections section ON section.id = field.section_id
    WHERE application.id = ${applicationId}::uuid
      AND field.key IN (SELECT jsonb_array_elements_text(${JSON.stringify(paths)}::jsonb))
    ORDER BY section.display_order, field.display_order, field.key
  `)
    : { rows: [] };
  const fields = result.rows
    .filter(isWorkflowRfiEditableField)
    .map((field) => ({
      label: field.label,
      path: field.key,
    }));
  if (allowedPaths.includes(workflowRfiDetailedResponseFieldPath)) {
    fields.push({
      label: "Written clarification",
      path: workflowRfiDetailedResponseFieldPath,
    });
  }
  return fields;
}

export async function assertWorkflowRfiFieldSelection(
  transaction: WorkflowActionExecutionTransaction,
  applicationId: string,
  paths: readonly string[],
) {
  const fields = await readWorkflowRfiFieldOptions(
    transaction,
    applicationId,
    paths,
  );
  if (fields.length !== paths.length) {
    throw new ResourceConflictError(
      "Select editable fields from this application's form. Business profile fields and documents cannot be opened as answers.",
    );
  }
}
