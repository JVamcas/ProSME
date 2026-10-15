import "server-only";

import { eq, inArray } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import {
  formDefinitions,
  formVersions,
  formFields,
  formSections,
  formFieldOptions,
} from "./form.schema";
import type { FormField } from "../FormTypes";
import { replaceDraftContent } from "./FormFieldWriteRepository";
import { systemSeedUserId } from "@/platform/database/SystemSeedPrincipal";

export async function readMigrationForms(
  transaction: DatabaseTransaction,
  versionIds: string[],
) {
  if (!versionIds.length) return new Map<string, MigrationSourceForm>();
  // Lock source versions before reading children so draft edits cannot race the copy.
  const versions = await transaction
    .select({
      id: formVersions.id,
      rowVersion: formVersions.rowVersion,
      versionNumber: formVersions.versionNumber,
      displayMode: formVersions.displayMode,
      showCompleteness: formVersions.showCompleteness,
      submissionMode: formVersions.submissionMode,
      instructions: formVersions.instructions,
      submitLabel: formVersions.submitLabel,
    })
    .from(formVersions)
    .where(inArray(formVersions.id, versionIds))
    .for("share");
  const [fields, sections, options] = await Promise.all([
    transaction
      .select()
      .from(formFields)
      .where(inArray(formFields.formVersionId, versionIds)),
    transaction
      .select()
      .from(formSections)
      .where(inArray(formSections.formVersionId, versionIds)),
    transaction
      .select({
        fieldId: formFieldOptions.fieldId,
        key: formFieldOptions.key,
        label: formFieldOptions.label,
        order: formFieldOptions.order,
      })
      .from(formFieldOptions)
      .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
      .where(inArray(formFields.formVersionId, versionIds)),
  ]);
  const byField = new Map<string, typeof options>();
  for (const option of options)
    byField.set(option.fieldId, [
      ...(byField.get(option.fieldId) ?? []),
      option,
    ]);
  return new Map(
    versions.map((version) => [
      version.id,
      {
        ...version,
        sections: sections.filter(
          (section) => section.formVersionId === version.id,
        ),
        fields: fields
          .filter((field) => field.formVersionId === version.id)
          .map((field): FormField => ({
            ...field,
            minimum: field.minimum ?? undefined,
            maximum: field.maximum ?? undefined,
            minLength: field.minLength ?? undefined,
            maxLength: field.maxLength ?? undefined,
            acceptedExtensions: field.acceptedExtensions ?? undefined,
            maxPages: field.maxPages ?? undefined,
            maximumFileSizeMb: field.maximumFileSizeMb ?? undefined,
            uploadedBy: field.uploadedBy ?? undefined,
            repeatable: field.repeatableConfiguration,
            options: (byField.get(field.id) ?? []).sort(
              (a, b) => a.order - b.order,
            ),
          })),
      },
    ]),
  );
}

export type MigrationSourceForm = {
  id: string;
  rowVersion: number;
  versionNumber: number;
  displayMode: import("../FormTypes").FormDisplayMode;
  submissionMode: import("../FormTypes").FormSubmissionMode;
  instructions: string | null;
  showCompleteness?: boolean;
  submitLabel: string;
  sections: import("../FormTypes").FormSection[];
  fields: FormField[];
};

export async function insertConvertedTaskForm(
  transaction: DatabaseTransaction,
  input: {
    code: string;
    name: string;
    source?: MigrationSourceForm;
    content: {
      fields: FormField[];
      sections: import("../FormTypes").FormSection[];
    };
  },
) {
  const [definition] = await transaction
    .insert(formDefinitions)
    .values({
      code: input.code,
      name: input.name,
      purpose: "APPLICATION_REVIEW",
      description: "Task form converted from workflow sections.",
      createdBy: systemSeedUserId,
    })
    .returning({ id: formDefinitions.id });
  const [version] = await transaction
    .insert(formVersions)
    .values({
      formDefinitionId: definition.id,
      versionNumber: 1,
      createdBy: systemSeedUserId,
      sourceVersionId: input.source?.id ?? null,
      displayMode: input.source?.displayMode ?? "STEPS",
      submissionMode: input.source?.submissionMode ?? "WITH_TASK_ACTION",
      showCompleteness: input.source?.showCompleteness ?? true,
      submitLabel: input.source?.submitLabel ?? "Complete task",
      instructions: input.source?.instructions ?? null,
      metadata: {
        code: input.code,
        name: input.name,
        description: "Task form converted from workflow sections.",
      },
    })
    .returning({ id: formVersions.id });
  await replaceDraftContent(
    transaction,
    version.id,
    input.content.fields,
    input.content.sections,
  );
  return { definitionId: definition.id, versionId: version.id };
}
