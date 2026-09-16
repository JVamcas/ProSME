import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formSubmissions,
  formVersions,
} from "@/db/schema";
import type {
  FormField,
  FormRuntimeSchema,
} from "@/modules/forms/FormTypes";

export async function listForms() {
  const result = await getDatabase().execute(sql`
    SELECT definition.id,
      definition.code,
      definition.name,
      definition.description,
      definition.active,
      latest.version_number AS "latestVersion",
      latest.status AS "latestStatus",
      COALESCE(field_counts.field_count, 0)::integer AS "fieldCount",
      COALESCE(usage_counts.used_by_count, 0)::integer AS "usedByCount",
      definition.updated_at AS "updatedAt"
    FROM app_form_definitions definition
    LEFT JOIN LATERAL (
      SELECT version_number, status, id
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
      SELECT count(*) AS used_by_count
      FROM app_stage_task_definitions task
      JOIN app_form_versions referenced_version
        ON referenced_version.id = task.form_version_id
      WHERE referenced_version.form_definition_id = definition.id
    ) usage_counts ON TRUE
    ORDER BY definition.name ASC, definition.id ASC
  `);
  return result.rows;
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
  const fields = await database
    .select()
    .from(formFields)
    .where(eq(formFields.formVersionId, versionId))
    .orderBy(asc(formFields.rowIndex), asc(formFields.columnIndex));
  const options = await database
    .select({
      code: formFieldOptions.code,
      fieldId: formFieldOptions.fieldId,
      label: formFieldOptions.label,
      position: formFieldOptions.position,
    })
    .from(formFieldOptions)
    .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
    .where(eq(formFields.formVersionId, versionId))
    .orderBy(asc(formFieldOptions.position));
  const byField = new Map<string, FormField["options"]>();
  for (const option of options) {
    const current = byField.get(option.fieldId) ?? [];
    current.push({
      code: option.code,
      label: option.label,
      position: option.position,
    });
    byField.set(option.fieldId, current);
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
    options: byField.get(field.id) ?? [],
    placeholder: field.placeholder,
    required: field.required,
    rowIndex: field.rowIndex,
    validation: field.validation as FormField["validation"],
  }));
}

export async function getFormEditor(definitionId: string) {
  const database = getDatabase();
  const [definition] = await database
    .select()
    .from(formDefinitions)
    .where(eq(formDefinitions.id, definitionId))
    .limit(1);
  if (!definition) return null;
  const versions = await database
    .select()
    .from(formVersions)
    .where(eq(formVersions.formDefinitionId, definitionId))
    .orderBy(desc(formVersions.versionNumber));
  const version = versions.find((item) => item.status === "DRAFT") ?? versions[0];
  if (!version) return null;
  return {
    definition,
    fields: await readFields(version.id),
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
  return {
    fields: await readFields(versionId),
    instructions: version.instructions,
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

export async function getSubmission(taskInstanceId: string) {
  const [submission] = await getDatabase()
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.taskInstanceId, taskInstanceId))
    .limit(1);
  return submission ?? null;
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
