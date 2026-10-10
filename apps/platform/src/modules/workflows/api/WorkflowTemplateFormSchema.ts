import { stableKeyFromLabel } from "../domain/WorkflowStableKey";
import { workflowTemplateDetailsSchema } from "./WorkflowTemplateSchemas";

export function workflowTemplateFormSchema(existingCode?: string) {
  return workflowTemplateDetailsSchema
    .omit({ code: true })
    .transform((input) => {
      const base = stableKeyFromLabel(input.name, "TEMPLATE");
      const code =
        existingCode ??
        `${base.slice(0, 67)}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      return { ...input, code };
    });
}
