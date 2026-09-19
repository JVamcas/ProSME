import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formFieldOptions,
  formFields,
  formSections,
} from "@/db/schema";
import type { FormField, FormSection } from "@/modules/forms/FormTypes";

export type FormTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function copySections(
  transaction: FormTransaction,
  sourceVersionId: string,
  targetVersionId: string,
) {
  const sections = await transaction
    .select({
      columnSpan: formSections.columnSpan,
      description: formSections.description,
      id: formSections.id,
      key: formSections.key,
      order: formSections.order,
      showContainer: formSections.showContainer,
      title: formSections.title,
    })
    .from(formSections)
    .where(eq(formSections.formVersionId, sourceVersionId));
  const sectionIds = new Map<string, string>();
  if (!sections.length) return sectionIds;
  await transaction.insert(formSections).values(
    sections.map((section) => {
      const id = crypto.randomUUID();
      sectionIds.set(section.id, id);
      return {
        columnSpan: section.columnSpan,
        description: section.description,
        formVersionId: targetVersionId,
        id,
        key: section.key,
        order: section.order,
        showContainer: section.showContainer,
        title: section.title,
      };
    }),
  );
  return sectionIds;
}

async function copyFields(
  transaction: FormTransaction,
  sourceVersionId: string,
  targetVersionId: string,
  sectionIds: ReadonlyMap<string, string>,
) {
  const [fields, options] = await Promise.all([
    transaction
      .select()
      .from(formFields)
      .where(eq(formFields.formVersionId, sourceVersionId)),
    transaction
      .select({
        fieldId: formFieldOptions.fieldId,
        key: formFieldOptions.key,
        label: formFieldOptions.label,
        order: formFieldOptions.order,
      })
      .from(formFieldOptions)
      .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
      .where(eq(formFields.formVersionId, sourceVersionId)),
  ]);
  if (!fields.length) return;
  const fieldIds = new Map(
    fields.map((field) => [field.id, crypto.randomUUID()]),
  );
  await transaction.insert(formFields).values(
    fields.map((field) => ({
      columnSpan: field.columnSpan,
      formVersionId: targetVersionId,
      helpText: field.helpText,
      maximum: field.maximum,
      maxLength: field.maxLength,
      minimum: field.minimum,
      minLength: field.minLength,
      id: fieldIds.get(field.id)!,
      key: field.key,
      label: field.label,
      order: field.order,
      required: field.required,
      sectionId: sectionIds.get(field.sectionId)!,
      type: field.type,
    })),
  );
  if (options.length) {
    await transaction.insert(formFieldOptions).values(
      options.map((option) => ({
        fieldId: fieldIds.get(option.fieldId)!,
        key: option.key,
        label: option.label,
        order: option.order,
      })),
    );
  }
}

export async function copyFormVersionChildren(
  transaction: FormTransaction,
  sourceVersionId: string,
  targetVersionId: string,
) {
  const sectionIds = await copySections(
    transaction,
    sourceVersionId,
    targetVersionId,
  );
  await copyFields(
    transaction,
    sourceVersionId,
    targetVersionId,
    sectionIds,
  );
}

async function deleteDraftFields(
  transaction: FormTransaction,
  versionId: string,
) {
  await transaction.delete(formFieldOptions).where(
    sql`${formFieldOptions.fieldId} in (select ${formFields.id} from ${formFields} where ${formFields.formVersionId} = ${versionId})`,
  );
  await transaction
    .delete(formFields)
    .where(eq(formFields.formVersionId, versionId));
}

async function replaceDraftSections(
  transaction: FormTransaction,
  versionId: string,
  sections: FormSection[],
) {
  await transaction
    .delete(formSections)
    .where(eq(formSections.formVersionId, versionId));
  if (!sections.length) return;
  await transaction.insert(formSections).values(
    sections.map((section) => ({
      columnSpan: section.columnSpan,
      description: section.description,
      formVersionId: versionId,
      id: section.id,
      key: section.key,
      order: section.order,
      showContainer: section.showContainer,
      title: section.title,
    })),
  );
}

async function insertDraftFields(
  transaction: FormTransaction,
  versionId: string,
  fields: FormField[],
) {
  if (!fields.length) return;
  const fieldIds = fields.map((field) => field.id ?? crypto.randomUUID());
  await transaction.insert(formFields).values(
    fields.map((field, index) => ({
      columnSpan: field.columnSpan,
      formVersionId: versionId,
      helpText: field.helpText ?? null,
      maximum: field.maximum ?? null,
      maxLength: field.maxLength ?? null,
      minimum: field.minimum ?? null,
      minLength: field.minLength ?? null,
      id: fieldIds[index],
      key: field.key,
      label: field.label,
      order: field.order,
      required: field.required,
      sectionId: field.sectionId,
      type: field.type,
    })),
  );
  const options = fields.flatMap((field, index) => (
    (field.options ?? []).map((option) => ({
      ...option,
      fieldId: fieldIds[index],
    }))
  ));
  if (options.length) {
    await transaction.insert(formFieldOptions).values(options);
  }
}

export async function replaceDraftContent(
  transaction: FormTransaction,
  versionId: string,
  fields: FormField[],
  sections: FormSection[],
) {
  await deleteDraftFields(transaction, versionId);
  await replaceDraftSections(transaction, versionId, sections);
  await insertDraftFields(transaction, versionId, fields);
}

export async function readPublicationFields(
  transaction: FormTransaction,
  versionId: string,
) {
  const [fields, options] = await Promise.all([
    transaction
      .select({
        columnSpan: formFields.columnSpan,
        helpText: formFields.helpText,
        id: formFields.id,
        key: formFields.key,
        label: formFields.label,
        maximum: formFields.maximum,
        maxLength: formFields.maxLength,
        minimum: formFields.minimum,
        minLength: formFields.minLength,
        order: formFields.order,
        required: formFields.required,
        sectionId: formFields.sectionId,
        type: formFields.type,
      })
      .from(formFields)
      .where(eq(formFields.formVersionId, versionId)),
    transaction
      .select()
      .from(formFieldOptions)
      .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
      .where(eq(formFields.formVersionId, versionId)),
  ]);
  const optionsByField = new Map<string, FormField["options"]>();
  for (const item of options) {
    const option = item.app_form_field_options;
    const fieldOptions = optionsByField.get(option.fieldId) ?? [];
    fieldOptions.push({
      key: option.key,
      label: option.label,
      order: option.order,
    });
    optionsByField.set(option.fieldId, fieldOptions);
  }
  return fields.map((field) => ({
    ...field,
    maximum: field.maximum ?? undefined,
    maxLength: field.maxLength ?? undefined,
    minimum: field.minimum ?? undefined,
    minLength: field.minLength ?? undefined,
    options: optionsByField.get(field.id) ?? [],
  }));
}
