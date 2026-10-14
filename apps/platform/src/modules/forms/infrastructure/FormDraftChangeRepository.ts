import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import { draftRowsSource, type DraftRow } from "./FormDraftSyncSql";
import { formFields, formSections } from "./form.schema";
import type { FormField } from "../FormTypes";

export function desiredFieldOptions(
  fieldRows: readonly DraftRow[],
  fields: readonly FormField[],
) {
  return fieldRows.map((field, index) => ({
    fieldId: field.id,
    options: (fields[index].options ?? []).map((option) => ({
      key: option.key,
      label: option.label,
      order: option.order,
    })),
  }));
}

export type DraftChanges = {
  deleteFields: boolean;
  deleteSections: boolean;
  releaseFields: boolean;
  releaseSections: boolean;
  writeFields: boolean;
  writeOptions: boolean;
  writeSections: boolean;
};

export async function readDraftChanges(
  transaction: DatabaseTransaction,
  versionId: string,
  fieldRows: readonly DraftRow[],
  sectionRows: readonly DraftRow[],
  fields: readonly FormField[],
): Promise<DraftChanges> {
  const result = await transaction.execute(sql`
    WITH desired_fields AS (SELECT * FROM ${draftRowsSource(formFields, fieldRows)}),
    desired_sections AS (SELECT * FROM ${draftRowsSource(formSections, sectionRows)}),
    desired_options AS (
      SELECT (item->>'fieldId')::uuid AS field_id, item->'options' AS options
      FROM jsonb_array_elements(${JSON.stringify(desiredFieldOptions(fieldRows, fields))}::jsonb) AS item
    ), current_options AS (
      SELECT option.field_id,
        jsonb_agg(jsonb_build_object('key', option.key, 'label', option.label, 'order', option.display_order) ORDER BY option.display_order) AS options
      FROM app_form_field_options AS option
      JOIN app_form_fields AS field ON field.id = option.field_id
      WHERE field.form_version_id = ${versionId}
      GROUP BY option.field_id
    )
    SELECT
      EXISTS (SELECT 1 FROM app_form_fields AS target
        WHERE target.form_version_id = ${versionId}
          AND NOT EXISTS (SELECT 1 FROM desired_fields WHERE id = target.id)) AS "deleteFields",
      EXISTS (SELECT 1 FROM app_form_sections AS target
        WHERE target.form_version_id = ${versionId}
          AND NOT EXISTS (SELECT 1 FROM desired_sections WHERE id = target.id)) AS "deleteSections",
      EXISTS (SELECT 1 FROM app_form_fields AS target
        JOIN desired_fields AS incoming ON incoming.id = target.id
        WHERE target.form_version_id = ${versionId}
          AND (target.key, target.display_order, target.section_id)
            IS DISTINCT FROM (incoming.key, incoming.display_order, incoming.section_id)) AS "releaseFields",
      EXISTS (SELECT 1 FROM app_form_sections AS target
        LEFT JOIN desired_sections AS incoming ON incoming.id = target.id
        WHERE target.form_version_id = ${versionId}
          AND (incoming.id IS NULL OR (target.key, target.display_order)
            IS DISTINCT FROM (incoming.key, incoming.display_order))) AS "releaseSections",
      EXISTS (SELECT 1 FROM desired_fields AS incoming
        LEFT JOIN app_form_fields AS target ON target.id = incoming.id AND target.form_version_id = incoming.form_version_id
        WHERE to_jsonb(target) IS DISTINCT FROM to_jsonb(incoming)) AS "writeFields",
      EXISTS (SELECT 1 FROM desired_sections AS incoming
        LEFT JOIN app_form_sections AS target ON target.id = incoming.id AND target.form_version_id = incoming.form_version_id
        WHERE to_jsonb(target) IS DISTINCT FROM to_jsonb(incoming)) AS "writeSections",
      EXISTS (SELECT 1 FROM desired_options AS incoming
        LEFT JOIN current_options AS target ON target.field_id = incoming.field_id
        WHERE incoming.options IS DISTINCT FROM coalesce(target.options, '[]'::jsonb)) AS "writeOptions"
  `);
  return result.rows[0] as DraftChanges;
}
