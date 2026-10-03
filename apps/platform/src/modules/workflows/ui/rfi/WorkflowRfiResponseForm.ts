import { z } from "zod";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";

export function workflowRfiResponseDefinition(
  detail: WorkflowRfiDetail,
): FormRuntimeSchema {
  return {
    displayMode: "SINGLE_PAGE",
    instructions: null,
    versionId: detail.id,
    versionNumber: 1,
    submitLabel: "Submit response",
    sections: [
      {
        id: detail.id,
        key: "REQUESTED_INFORMATION",
        columnSpan: 2,
        title: "Information to update",
        description:
          "Only the fields requested by the reviewer are open for editing.",
        order: 1,
        showContainer: true,
      },
    ],
    fields: detail.editableFields.map((field, index) => ({
      ...field.definition,
      columnSpan: field.definition?.columnSpan ?? 2,
      helpText: field.definition?.helpText,
      key: field.path,
      label: field.label,
      maximum: field.definition?.maximum ?? undefined,
      maxLength: field.definition?.maxLength ?? undefined,
      minimum: field.definition?.minimum ?? undefined,
      minLength: field.definition?.minLength ?? undefined,
      options: field.options,
      order: index + 1,
      required:
        field.path === workflowRfiDetailedResponseFieldPath ||
        Boolean(field.definition?.required),
      sectionId: detail.id,
      type: field.type,
      visibilityCondition: null,
    })),
  };
}

export function workflowRfiInitialValues(detail: WorkflowRfiDetail) {
  return Object.fromEntries(
    detail.editableFields.flatMap((field) => {
      const value = Object.hasOwn(detail.draft?.fieldValues ?? {}, field.path)
        ? detail.draft!.fieldValues[field.path]
        : field.currentValue;
      return value === null || value === undefined ? [] : [[field.path, value]];
    }),
  );
}

export function workflowRfiResponseSchema(definition: FormRuntimeSchema) {
  return z
    .object({ fieldValues: z.record(z.string(), z.unknown()) })
    .superRefine((values, context) => {
      if (!validateFormValues(definition.fields, values.fieldValues, true)) {
        context.addIssue({
          code: "custom",
          message: "Complete the requested application fields.",
          path: ["fieldValues"],
        });
      }
      const clarification =
        values.fieldValues[workflowRfiDetailedResponseFieldPath];
      if (
        definition.fields.some(
          (field) => field.key === workflowRfiDetailedResponseFieldPath,
        ) &&
        (typeof clarification !== "string" ||
          !richTextToPlainText(clarification))
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter the requested written clarification.",
          path: ["fieldValues"],
        });
      }
    });
}
