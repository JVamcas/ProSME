import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
} from "@/db/schema";
import type {
  FormDefinitionPage,
  FormField,
  FormRuntimeSchema,
} from "@/modules/forms/FormTypes";
import type { FormListInput } from "@/modules/forms/api/FormTransportTypes";

export async function listForms(
  input: FormListInput,
): Promise<FormDefinitionPage> {
  const database = getDatabase();
  const offset = (input.page - 1) * input.pageSize;
  const [result, countResult] = await Promise.all([
    database.execute(sql`
    SELECT definition.id,
      definition.code,
      definition.name,
      definition.description,
      definition.active,
      latest.id AS "latestVersionId",
      latest.version_number AS "latestVersion",
      latest.row_version AS "latestVersionRowVersion",
      latest.status AS "latestStatus",
      COALESCE(field_counts.field_count, 0)::integer AS "fieldCount",
      COALESCE(section_counts.section_count, 0)::integer AS "sectionCount",
      COALESCE(usage_counts.used_by_count, 0)::integer AS "usedByCount",
      definition.updated_at AS "updatedAt"
    FROM app_form_definitions definition
    LEFT JOIN LATERAL (
      SELECT version_number, row_version, status, id
      FROM app_form_versions
      WHERE form_definition_id = definition.id
      ORDER BY version_number DESC
      LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS field_count
      FROM app_form_fields field
      WHERE field.form_version_id = latest.id
    ) field_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS section_count
      FROM app_form_sections section
      WHERE section.form_version_id = latest.id
    ) section_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS used_by_count
      FROM app_stage_task_definitions task
      JOIN app_form_versions referenced_version
        ON referenced_version.id = task.form_version_id
      WHERE referenced_version.form_definition_id = definition.id
    ) usage_counts ON TRUE
    ORDER BY definition.name ASC, definition.id ASC
    LIMIT ${input.pageSize}
    OFFSET ${offset}
  `),
    database.execute(sql`
      SELECT count(*)::integer AS total
      FROM app_form_definitions
    `),
  ]);
  const total = Number(countResult.rows[0]?.total ?? 0);
  return {
    items: result.rows as FormDefinitionPage["items"],
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function listPublishedFormVersions() {
  return getDatabase()
    .select({
      definitionId: formDefinitions.id,
      formName: formDefinitions.name,
      versionId: formVersions.id,
      versionNumber: formVersions.versionNumber,
    })
    .from(formVersions)
    .innerJoin(
      formDefinitions,
      eq(formDefinitions.id, formVersions.formDefinitionId),
    )
    .where(eq(formVersions.status, "PUBLISHED"))
    .orderBy(asc(formDefinitions.name), desc(formVersions.versionNumber));
}

async function readFields(versionId: string) {
  const database = getDatabase();
  const [fields, options] = await Promise.all([
    database
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
        visibilityCondition: formFields.visibilityCondition,
      })
      .from(formFields)
      .innerJoin(formSections, eq(formSections.id, formFields.sectionId))
      .where(eq(formFields.formVersionId, versionId))
      .orderBy(asc(formSections.order), asc(formFields.order)),
    database
      .select({
        fieldId: formFieldOptions.fieldId,
        key: formFieldOptions.key,
        label: formFieldOptions.label,
        order: formFieldOptions.order,
      })
      .from(formFieldOptions)
      .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
      .where(eq(formFields.formVersionId, versionId))
      .orderBy(asc(formFieldOptions.order)),
  ]);
  const byField = new Map<string, FormField["options"]>();
  for (const option of options) {
    const current = byField.get(option.fieldId) ?? [];
    current.push({
      key: option.key,
      label: option.label,
      order: option.order,
    });
    byField.set(option.fieldId, current);
  }
  return fields.map((field) => ({
    columnSpan: field.columnSpan,
    helpText: field.helpText,
    id: field.id,
    key: field.key,
    label: field.label,
    maximum: field.maximum ?? undefined,
    maxLength: field.maxLength ?? undefined,
    minimum: field.minimum ?? undefined,
    minLength: field.minLength ?? undefined,
    options: byField.get(field.id) ?? [],
    order: field.order,
    required: field.required,
    sectionId: field.sectionId,
    type: field.type,
    visibilityCondition: field.visibilityCondition,
  }));
}

async function readSections(versionId: string) {
  return getDatabase()
    .select({
      columnSpan: formSections.columnSpan,
      description: formSections.description,
      id: formSections.id,
      key: formSections.key,
      order: formSections.order,
      showContainer: formSections.showContainer,
      title: formSections.title,
      visibilityCondition: formSections.visibilityCondition,
    })
    .from(formSections)
    .where(eq(formSections.formVersionId, versionId))
    .orderBy(asc(formSections.order));
}

export async function getFormEditor(definitionId: string) {
  const database = getDatabase();
  const [definitions, versions] = await Promise.all([
    database
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.id, definitionId))
      .limit(1),
    database
      .select()
      .from(formVersions)
      .where(eq(formVersions.formDefinitionId, definitionId))
      .orderBy(desc(formVersions.versionNumber)),
  ]);
  const [definition] = definitions;
  if (!definition) return null;
  const version = versions.find((item) => item.status === "DRAFT") ?? versions[0];
  if (!version) return null;
  const [fields, sections] = await Promise.all([
    readFields(version.id),
    readSections(version.id),
  ]);
  return {
    definition,
    fields,
    sections,
    version,
    versions,
  };
}

export async function getFormRuntime(
  versionId: string,
): Promise<FormRuntimeSchema | null> {
  const database = getDatabase();
  const [version] = await database
    .select()
    .from(formVersions)
    .where(eq(formVersions.id, versionId))
    .limit(1);
  if (!version || !["PUBLISHED", "RETIRED"].includes(version.status)) {
    return null;
  }
  const [fields, sections] = await Promise.all([
    readFields(versionId),
    readSections(versionId),
  ]);
  return {
    fields,
    instructions: version.instructions,
    sections,
    submitLabel: version.submitLabel,
    versionId: version.id,
    versionNumber: version.versionNumber,
  };
}

export async function getPublishedFormRuntime(versionId: string) {
  const runtime = await getFormRuntime(versionId);
  if (!runtime) return null;
  return runtime;
}

export async function getFormVersionForWrite(versionId: string) {
  const database = getDatabase();
  const [version] = await database
    .select()
    .from(formVersions)
    .where(eq(formVersions.id, versionId))
    .limit(1);
  if (!version) return null;
  return {
    fields: await readFields(versionId),
    version,
  };
}
