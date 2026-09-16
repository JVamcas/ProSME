import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formVersions,
} from "@/db/schema";
import type { FormField } from "@/modules/forms/FormTypes";
import { formPublicationErrors } from "@/modules/forms/FormValidation";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function copyFieldOptions(
  transaction: Transaction,
  sourceFieldId: string,
  targetFieldId: string,
) {
  const options = await transaction
    .select()
    .from(formFieldOptions)
    .where(eq(formFieldOptions.fieldId, sourceFieldId));
  if (!options.length) return;
  await transaction.insert(formFieldOptions).values(
    options.map((option) => ({
      code: option.code,
      fieldId: targetFieldId,
      label: option.label,
      position: option.position,
    })),
  );
}

async function copyFields(
  transaction: Transaction,
  sourceVersionId: string,
  targetVersionId: string,
) {
  const fields = await transaction
    .select()
    .from(formFields)
    .where(eq(formFields.formVersionId, sourceVersionId));
  for (const field of fields) {
    const [createdField] = await transaction
      .insert(formFields)
      .values({
        code: field.code,
        columnIndex: field.columnIndex,
        columnSpan: field.columnSpan,
        dataType: field.dataType,
        formVersionId: targetVersionId,
        helpText: field.helpText,
        inputType: field.inputType,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        rowIndex: field.rowIndex,
        validation: field.validation,
      })
      .returning();
    await copyFieldOptions(transaction, field.id, createdField.id);
  }
}

async function replaceDraftFields(
  transaction: Transaction,
  versionId: string,
  fields: FormField[],
) {
  await transaction.delete(formFieldOptions).where(
    sql`${formFieldOptions.fieldId} in (select ${formFields.id} from ${formFields} where ${formFields.formVersionId} = ${versionId})`,
  );
  await transaction
    .delete(formFields)
    .where(eq(formFields.formVersionId, versionId));
  for (const field of fields) {
    const [record] = await transaction
      .insert(formFields)
      .values({
        code: field.code,
        columnIndex: field.columnIndex,
        columnSpan: field.columnSpan,
        dataType: field.dataType,
        formVersionId: versionId,
        helpText: field.helpText ?? null,
        inputType: field.inputType,
        label: field.label,
        placeholder: field.placeholder ?? null,
        required: field.required,
        rowIndex: field.rowIndex,
        validation: field.validation ?? null,
      })
      .returning();
    if (field.options?.length) {
      await transaction.insert(formFieldOptions).values(
        field.options.map((option) => ({ ...option, fieldId: record.id })),
      );
    }
  }
}

async function readPublicationFields(
  transaction: Transaction,
  versionId: string,
) {
  const fields = await transaction
    .select()
    .from(formFields)
    .where(eq(formFields.formVersionId, versionId));
  const options = await transaction
    .select()
    .from(formFieldOptions)
    .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
    .where(eq(formFields.formVersionId, versionId));
  const optionsByField = new Map<string, FormField["options"]>();
  for (const item of options) {
    const fieldOptions = optionsByField.get(
      item.app_form_field_options.fieldId,
    ) ?? [];
    fieldOptions.push({
      code: item.app_form_field_options.code,
      label: item.app_form_field_options.label,
      position: item.app_form_field_options.position,
    });
    optionsByField.set(item.app_form_field_options.fieldId, fieldOptions);
  }
  return fields.map((field) => ({
    code: field.code,
    columnIndex: field.columnIndex as 1 | 2,
    columnSpan: field.columnSpan as 1 | 2,
    dataType: field.dataType,
    helpText: field.helpText,
    id: field.id,
    inputType: field.inputType,
    label: field.label,
    options: optionsByField.get(field.id) ?? [],
    placeholder: field.placeholder,
    required: field.required,
    rowIndex: field.rowIndex,
    validation: field.validation as FormField["validation"],
  }));
}

export async function createForm(input: {
  actorId: string;
  code: string;
  description: string;
  instructions?: string | null;
  name: string;
  submitLabel: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .insert(formDefinitions)
      .values({
        code: input.code,
        createdBy: input.actorId,
        description: input.description,
        name: input.name,
      })
      .returning();
    const [version] = await transaction
      .insert(formVersions)
      .values({
        createdBy: input.actorId,
        formDefinitionId: definition.id,
        instructions: input.instructions ?? null,
        submitLabel: input.submitLabel,
        versionNumber: 1,
      })
      .returning();
    return { definition, version };
  });
}

export async function cloneFormVersion(input: {
  actorId: string;
  definitionId: string;
  sourceVersionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .select({ id: formDefinitions.id })
      .from(formDefinitions)
      .where(eq(formDefinitions.id, input.definitionId))
      .for("update")
      .limit(1);
    if (!definition) return null;
    const [draft] = await transaction
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(
        and(
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
        ),
      )
      .limit(1);
    if (draft) return null;
    const [latest] = await transaction
      .select({
        versionNumber: sql<number>`coalesce(max(${formVersions.versionNumber}), 0)`,
      })
      .from(formVersions)
      .where(eq(formVersions.formDefinitionId, input.definitionId));
    const [source] = await transaction
      .select()
      .from(formVersions)
      .where(
        and(
          eq(formVersions.id, input.sourceVersionId),
          eq(formVersions.formDefinitionId, input.definitionId),
        ),
      )
      .limit(1);
    if (!source || source.status === "DRAFT") return null;
    const [version] = await transaction
      .insert(formVersions)
      .values({
        createdBy: input.actorId,
        formDefinitionId: input.definitionId,
        instructions: source.instructions,
        submitLabel: source.submitLabel,
        versionNumber: Number(latest.versionNumber) + 1,
      })
      .returning();
    await copyFields(transaction, source.id, version.id);
    return version;
  });
}

export async function saveFormDraft(input: {
  actorId: string;
  code?: string;
  definitionId: string;
  description?: string;
  expectedRowVersion: number;
  fields: FormField[];
  instructions?: string | null;
  name?: string;
  submitLabel: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [version] = await transaction
      .update(formVersions)
      .set({
        instructions: input.instructions ?? null,
        rowVersion: input.expectedRowVersion + 1,
        submitLabel: input.submitLabel,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
          eq(formVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning();
    if (!version) return null;
    if (input.code || input.description !== undefined || input.name) {
      await transaction
        .update(formDefinitions)
        .set({
          code: input.code,
          description: input.description,
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(formDefinitions.id, input.definitionId));
    }
    await replaceDraftFields(transaction, version.id, input.fields);
    return version;
  });
}

export async function publishFormVersion(input: {
  actorId: string;
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(formVersions)
      .where(
        and(
          eq(formVersions.id, input.versionId),
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
          eq(formVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) return { kind: "conflict" as const };
    const fields = await readPublicationFields(transaction, input.versionId);
    const errors = formPublicationErrors(fields, current.submitLabel);
    if (errors.length) return { errors, kind: "invalid" as const };
    const [version] = await transaction
      .update(formVersions)
      .set({
        publishedAt: new Date(),
        publishedBy: input.actorId,
        rowVersion: input.expectedRowVersion + 1,
        status: "PUBLISHED",
        updatedAt: new Date(),
      })
      .where(eq(formVersions.id, input.versionId))
      .returning();
    return { kind: "published" as const, version };
  });
}

export async function retireFormVersion(input: {
  actorId: string;
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
}) {
  const [version] = await getDatabase()
    .update(formVersions)
    .set({
      retiredAt: new Date(),
      rowVersion: input.expectedRowVersion + 1,
      status: "RETIRED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(formVersions.id, input.versionId),
        eq(formVersions.formDefinitionId, input.definitionId),
        eq(formVersions.status, "PUBLISHED"),
        eq(formVersions.rowVersion, input.expectedRowVersion),
      ),
    )
    .returning();
  return version ?? null;
}
