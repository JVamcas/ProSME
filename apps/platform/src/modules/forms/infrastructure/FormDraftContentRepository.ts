import "server-only";

import { sql } from "drizzle-orm";
import type { FormField, FormSection } from "../FormTypes";
import type { DatabaseTransaction } from "@/platform/database/client";
import { draftFieldRow, draftSectionRow } from "./FormDraftRowMapping";
import {
  draftIds,
  releaseDraftPositions,
  syncDraftRows,
} from "./FormDraftSyncSql";
import {
  desiredFieldOptions,
  readDraftChanges,
} from "./FormDraftChangeRepository";
import { formFields, formSections } from "./form.schema";

async function syncOptions(
  transaction: DatabaseTransaction,
  versionId: string,
  fields: ReturnType<typeof draftFieldRow>[],
  source: FormField[],
) {
  const incoming = desiredFieldOptions(fields, source);
  // Compare complete ordered option lists in SQL. Delete/reinsert options only
  // for fields whose options changed; editing a label leaves options untouched.
  await transaction.execute(sql`
    WITH desired AS (
      SELECT (item->>'fieldId')::uuid AS field_id, item->'options' AS options
      FROM jsonb_array_elements(${JSON.stringify(incoming)}::jsonb) AS item
    ), current_options AS (
      SELECT option.field_id,
        jsonb_agg(jsonb_build_object('key', option.key, 'label', option.label, 'order', option.display_order) ORDER BY option.display_order) AS options
      FROM app_form_field_options AS option
      JOIN desired ON desired.field_id = option.field_id
      GROUP BY option.field_id
    ), changed AS (
      SELECT desired.* FROM desired
      JOIN app_form_fields AS field ON field.id = desired.field_id
      LEFT JOIN current_options ON current_options.field_id = desired.field_id
      WHERE field.form_version_id = ${versionId}
        AND desired.options IS DISTINCT FROM coalesce(current_options.options, '[]'::jsonb)
    ), removed AS (
      DELETE FROM app_form_field_options AS option
      USING changed WHERE option.field_id = changed.field_id
      RETURNING option.id
    )
    INSERT INTO app_form_field_options (field_id, key, label, display_order)
    SELECT changed.field_id, option->>'key', option->>'label', (option->>'order')::integer
    FROM changed CROSS JOIN LATERAL jsonb_array_elements(changed.options) AS option
    CROSS JOIN (SELECT count(*) FROM removed) AS deletion_complete
  `);
}

export async function syncDraftContent(
  transaction: DatabaseTransaction,
  versionId: string,
  fields: FormField[],
  sections: FormSection[],
) {
  const fieldRows = fields.map((field) => draftFieldRow(versionId, field));
  const sectionRows = sections.map((section) =>
    draftSectionRow(versionId, section),
  );
  const changes = await readDraftChanges(
    transaction,
    versionId,
    fieldRows,
    sectionRows,
    fields,
  );
  // Dependent writes retain FK integrity: remove deleted fields, establish
  // destination sections, move/update fields, then remove obsolete sections.
  if (changes.deleteFields)
    await transaction.execute(sql`
    WITH removed_options AS (
      DELETE FROM app_form_field_options AS option
      USING app_form_fields AS field
      WHERE option.field_id = field.id AND field.form_version_id = ${versionId}
        AND NOT (${draftIds(fieldRows)} ? field.id::text)
      RETURNING option.id
    )
    DELETE FROM app_form_fields AS field
    USING (SELECT count(*) FROM removed_options) AS deletion_complete
    WHERE field.form_version_id = ${versionId}
      AND NOT (${draftIds(fieldRows)} ? field.id::text)
  `);
  if (changes.releaseSections && changes.writeSections) {
    await releaseDraftPositions(
      transaction,
      formSections,
      versionId,
      sectionRows,
    );
  }
  if (changes.writeSections)
    await syncDraftRows(transaction, formSections, sectionRows);
  if (changes.releaseFields) {
    await releaseDraftPositions(
      transaction,
      formFields,
      versionId,
      fieldRows,
      true,
    );
  }
  if (changes.writeFields)
    await syncDraftRows(transaction, formFields, fieldRows);
  if (changes.deleteSections)
    await transaction.execute(sql`
    DELETE FROM app_form_sections AS section
    WHERE section.form_version_id = ${versionId}
      AND NOT (${draftIds(sectionRows)} ? section.id::text)
  `);
  if (changes.writeOptions)
    await syncOptions(transaction, versionId, fieldRows, fields);
}
