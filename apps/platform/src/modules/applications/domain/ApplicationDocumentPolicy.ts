import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { resolveFormVisibility } from "@/modules/forms/engine/FormVisibility";
import type { ApplicationDocumentRequirement } from "../api/ApplicationDocumentSchemas";

export const applicationDocumentMaximumBytes = 10 * 1024 * 1024;
export const applicationDocumentAllowedFiles = {
  ".docx": {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: "zip",
  },
  ".jpeg": { contentType: "image/jpeg", signature: "jpeg" },
  ".jpg": { contentType: "image/jpeg", signature: "jpeg" },
  ".pdf": { contentType: "application/pdf", signature: "pdf" },
  ".png": { contentType: "image/png", signature: "png" },
} as const;

export type ApplicationDocumentExtension =
  keyof typeof applicationDocumentAllowedFiles;

export function applicationDocumentRequirements(
  form: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
): ApplicationDocumentRequirement[] {
  const visible = resolveFormVisibility(form, values);
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
        acceptedExtensions: Object.keys(applicationDocumentAllowedFiles),
        key: field.key,
        label: field.label,
        maximumBytes: applicationDocumentMaximumBytes,
        maximumFiles: 1,
        required: field.required,
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
    sections: form.sections.filter((section) => (
      documentSectionIds.has(section.id ?? "")
    )),
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
