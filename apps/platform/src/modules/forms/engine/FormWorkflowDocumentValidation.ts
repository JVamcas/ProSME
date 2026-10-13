import type { FormField } from "../FormTypes";
import { formWorkflowDocumentSchema } from "../api/FormWorkflowDocumentSchema";

export function formWorkflowDocumentErrors(fields: readonly FormField[]) {
  const errors: string[] = [];
  const keys = new Set<string>();
  const names = new Set<string>();
  for (const field of fields) {
    if (!field.workflowDocument) continue;
    if (
      field.type !== "DOCUMENT" ||
      !formWorkflowDocumentSchema.safeParse(field.workflowDocument).success
    ) {
      errors.push(`${field.label}: invalid workflow document policy.`);
      continue;
    }
    if (keys.has(field.workflowDocument.stableKey) || names.has(field.label)) {
      errors.push(
        `${field.label}: workflow document keys and names must be unique within the form.`,
      );
    }
    keys.add(field.workflowDocument.stableKey);
    names.add(field.label);
  }
  return errors;
}
