import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { FormSearchContent } from "../domain/FormSearchContent";

export async function readFormSearchContent(
  versionIds: string[],
): Promise<FormSearchContent[]> {
  if (!versionIds.length) return [];
  const result = await getDatabase().execute(sql`
    SELECT d.id AS "definitionId", v.version_number AS "versionNumber",
      v.id AS "versionId", coalesce(v.metadata->>'name', d.name) AS name,
      coalesce(v.metadata->>'description', d.description, '') AS description,
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'description', s.description,
        'fields', coalesce((SELECT jsonb_agg(jsonb_build_object(
           'key', f.key, 'label', f.label, 'helpText', coalesce(f.help_text, ''),
          'details', coalesce(jsonb_path_query_array(f.repeatable_configuration, '$.fields[*].label'), '[]'::jsonb)
            || coalesce(jsonb_path_query_array(f.repeatable_configuration, '$.fields[*].helpText ? (@.type() == "string")'), '[]'::jsonb)
            || coalesce(jsonb_path_query_array(f.repeatable_configuration, '$.fields[*].options[*].label'), '[]'::jsonb),
          'options', coalesce((SELECT jsonb_agg(o.label ORDER BY o.display_order)
            FROM app_form_field_options o WHERE o.field_id = f.id), '[]'::jsonb)
        ) ORDER BY f.display_order) FROM app_form_fields f WHERE f.section_id = s.id), '[]'::jsonb)
      ) ORDER BY s.display_order) FROM app_form_sections s
        WHERE s.form_version_id = v.id), '[]'::jsonb) AS sections
    FROM app_form_versions v
    JOIN app_form_definitions d ON d.id = v.form_definition_id
    WHERE v.id IN (${sql.join(
      versionIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
    ORDER BY v.id
  `);
  return result.rows as FormSearchContent[];
}
