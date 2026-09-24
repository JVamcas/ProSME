ALTER TABLE app_form_submissions
ADD COLUMN definition_snapshot jsonb;
--> statement-breakpoint
UPDATE app_form_submissions submission
SET definition_snapshot = jsonb_build_object(
  'versionId', version.id,
  'versionNumber', version.version_number,
  'instructions', version.instructions,
  'submitLabel', version.submit_label,
  'sections', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', section.id,
        'key', section.key,
        'title', section.title,
        'description', section.description,
        'columnSpan', section.column_span,
        'showContainer', section.show_container,
        'order', section.display_order
      )
      ORDER BY section.display_order
    )
    FROM app_form_sections section
    WHERE section.form_version_id = version.id
  ), '[]'::jsonb),
  'fields', COALESCE((
    SELECT jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'id', field.id,
        'sectionId', field.section_id,
        'columnSpan', field.column_span,
        'key', field.key,
        'label', field.label,
        'type', field.type,
        'required', field.required,
        'helpText', field.help_text,
        'minimum', field.minimum,
        'maximum', field.maximum,
        'minLength', field.min_length,
        'maxLength', field.max_length,
        'order', field.display_order,
        'options', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', option.key,
              'label', option.label,
              'order', option.display_order
            )
            ORDER BY option.display_order
          )
          FROM app_form_field_options option
          WHERE option.field_id = field.id
        ), '[]'::jsonb)
      ))
      ORDER BY section.display_order, field.display_order
    )
    FROM app_form_fields field
    JOIN app_form_sections section ON section.id = field.section_id
    WHERE field.form_version_id = version.id
  ), '[]'::jsonb)
)
FROM app_form_versions version
WHERE submission.form_version_id = version.id
  AND submission.status = 'COMPLETED';
--> statement-breakpoint
ALTER TABLE app_form_submissions
ADD CONSTRAINT app_form_submissions_completion_snapshot_check
CHECK (
  (
    status = 'DRAFT'
    AND completed_at IS NULL
    AND definition_snapshot IS NULL
  )
  OR
  (
    status = 'COMPLETED'
    AND completed_at IS NOT NULL
    AND definition_snapshot IS NOT NULL
    AND jsonb_typeof(definition_snapshot) = 'object'
    AND definition_snapshot->>'versionId' = form_version_id::text
  )
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_completed_form_submission()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'completed form submissions are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_form_submissions_immutable
BEFORE UPDATE OR DELETE ON app_form_submissions
FOR EACH ROW EXECUTE FUNCTION protect_completed_form_submission();
