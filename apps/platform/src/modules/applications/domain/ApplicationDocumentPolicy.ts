import {
  defaultFormDocumentExtensions,
  formDocumentFileTypes,
} from "@/modules/forms/domain/FormDocumentTypes";
import { formFieldIsEditable } from "@/modules/forms/engine/FormFieldBehaviour";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  activeFormDefinition,
  sanitizeFormResponseValues,
} from "@/modules/forms/engine/FormVisibility";
import type {
  ApplicationDocumentRegister,
  ApplicationDocumentRequirement,
} from "../api/ApplicationDocumentSchemas";

export const applicationDocumentMaximumBytes = 10 * 1024 * 1024;
export const applicationDocumentAllowedFiles = formDocumentFileTypes;

export type ApplicationDocumentExtension =
  keyof typeof applicationDocumentAllowedFiles;

export function applicationDocumentRequirements(
  form: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
): ApplicationDocumentRequirement[] {
  const visible = activeFormDefinition(form, values);
  const ruleValues = sanitizeFormResponseValues(form, values);
  const sections = new Map(
    visible.sections.map((section) => [section.id, section]),
  );
  return visible.fields
    .filter((field) => field.type === "DOCUMENT")
    .map((field) => {
      const section = sections.get(field.sectionId);
      if (!section) {
        throw new Error(`Document requirement ${field.key} has no section.`);
      }
      return {
        acceptedExtensions:
          field.maxPages === undefined
            ? [...(field.acceptedExtensions ?? defaultFormDocumentExtensions)]
            : [".pdf"],
        key: field.key,
        label: field.label,
        maximumBytes:
          field.maximumFileSizeMb === undefined
            ? applicationDocumentMaximumBytes
            : field.maximumFileSizeMb * 1024 * 1024,
        maxPages: field.maxPages,
        maximumFiles: 1,
        required: field.required,
        editable: field.uploadedBy !== "ASSIGNED_REVIEWER" && formFieldIsEditable(field, ruleValues),
        sectionKey: section.key,
        sectionTitle: section.title,
      };
    });
}

export function applicationResponseForm(form: FormRuntimeSchema) {
  const documentSectionIds = new Set(
    form.fields
      .filter((field) => field.type !== "DOCUMENT")
      .map((field) => field.sectionId),
  );
  return {
    ...form,
    fields: form.fields.filter((field) => field.type !== "DOCUMENT"),
    sections: form.sections.filter((section) =>
      documentSectionIds.has(section.id ?? ""),
    ),
  };
}

export function applicationResponseValues(
  form: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
) {
  const allowed = new Set(
    form.fields
      .filter((field) => field.type !== "DOCUMENT")
      .map((field) => field.key),
  );
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => allowed.has(key)),
  );
}

export function applicationDocumentCompletion(
  register: ApplicationDocumentRegister,
) {
  const required = register.requirements.filter((item) => item.required);
  const documents = new Map(
    register.documents.map((document) => [document.requirementKey, document]),
  );
  const completedCount = required.filter((requirement) => {
    const document = documents.get(requirement.key);
    return document?.storageStatus === "finalized";
  }).length;
  return { completedCount, requiredCount: required.length };
}
