import type { FormField } from "@/modules/forms/FormTypes";
import { attachedBusinessFieldKeys } from "@/modules/applications/domain/AttachedApplicationForm";

// Entity details are supplied by the business profile; documents have their
// own request/upload lifecycle and must not become editable answer fields.
export function isWorkflowRfiEditableField(
  field: Pick<FormField, "key" | "type">,
) {
  return field.type !== "DOCUMENT" && !attachedBusinessFieldKeys.has(field.key);
}

export type WorkflowRfiFieldOption = {
  label: string;
  path: string;
};
