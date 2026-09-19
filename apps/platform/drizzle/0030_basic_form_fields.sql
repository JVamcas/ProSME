ALTER TABLE app_form_fields DISABLE TRIGGER app_form_fields_mutability;
--> statement-breakpoint
ALTER TABLE app_form_sections DISABLE TRIGGER app_form_sections_mutability;
--> statement-breakpoint
ALTER TABLE app_form_fields ADD COLUMN section_id uuid;
--> statement-breakpoint
INSERT INTO app_form_sections (
  id,
  form_version_id,
  key,
  title,
  description,
  display_order
)
SELECT
  gen_random_uuid(),
  version.id,
  'GENERAL',
  'General',
  '',
  1
FROM app_form_versions version
WHERE EXISTS (
  SELECT 1
  FROM app_form_fields field
  WHERE field.form_version_id = version.id
)
AND NOT EXISTS (
  SELECT 1
  FROM app_form_sections section
  WHERE section.form_version_id = version.id
);
--> statement-breakpoint
UPDATE app_form_fields field
SET section_id = (
  SELECT section.id
  FROM app_form_sections section
  WHERE section.form_version_id = field.form_version_id
  ORDER BY section.display_order, section.id
  LIMIT 1
);
--> statement-breakpoint
ALTER TABLE app_form_fields
  DROP CONSTRAINT app_form_fields_version_code_unique,
  DROP CONSTRAINT app_form_fields_version_position_unique,
  DROP CONSTRAINT app_form_fields_row_positive_check,
  DROP CONSTRAINT app_form_fields_column_check,
  DROP CONSTRAINT app_form_fields_span_check,
  DROP CONSTRAINT app_form_fields_span_start_check;
--> statement-breakpoint
DROP INDEX app_form_fields_version_order_idx;
--> statement-breakpoint
ALTER TABLE app_form_fields RENAME COLUMN code TO key;
--> statement-breakpoint
ALTER TABLE app_form_fields RENAME COLUMN input_type TO type;
--> statement-breakpoint
ALTER TABLE app_form_fields RENAME COLUMN row_index TO display_order;
--> statement-breakpoint
UPDATE app_form_fields
SET type = CASE type
  WHEN 'MONEY' THEN 'NUMBER'
  WHEN 'RADIO' THEN 'SELECT'
  WHEN 'CHECKBOX' THEN 'YES_NO'
  ELSE type
END;
--> statement-breakpoint
WITH ranked_fields AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY section_id
      ORDER BY display_order, column_index, id
    ) AS new_order
  FROM app_form_fields
)
UPDATE app_form_fields field
SET display_order = ranked.new_order
FROM ranked_fields ranked
WHERE ranked.id = field.id;
--> statement-breakpoint
ALTER TABLE app_form_fields
  ALTER COLUMN section_id SET NOT NULL,
  DROP COLUMN data_type,
  DROP COLUMN column_index,
  DROP COLUMN column_span,
  DROP COLUMN placeholder,
  DROP COLUMN validation,
  ADD CONSTRAINT app_form_fields_version_key_unique
    UNIQUE (form_version_id, key),
  ADD CONSTRAINT app_form_fields_section_order_unique
    UNIQUE (section_id, display_order),
  ADD CONSTRAINT app_form_fields_type_check
    CHECK (type IN ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'YES_NO', 'SELECT')),
  ADD CONSTRAINT app_form_fields_order_check CHECK (display_order > 0);
--> statement-breakpoint
ALTER TABLE app_form_sections
  ADD CONSTRAINT app_form_sections_id_version_unique
    UNIQUE (id, form_version_id);
--> statement-breakpoint
ALTER TABLE app_form_fields
  ADD CONSTRAINT app_form_fields_section_version_fk
    FOREIGN KEY (section_id, form_version_id)
    REFERENCES app_form_sections(id, form_version_id)
    ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX app_form_fields_section_order_idx
  ON app_form_fields(section_id, display_order);
--> statement-breakpoint
ALTER TABLE app_form_field_options
  DROP CONSTRAINT app_form_field_options_code_unique,
  DROP CONSTRAINT app_form_field_options_position_unique,
  DROP CONSTRAINT app_form_field_options_position_check;
--> statement-breakpoint
ALTER TABLE app_form_field_options RENAME COLUMN code TO key;
--> statement-breakpoint
ALTER TABLE app_form_field_options RENAME COLUMN position TO display_order;
--> statement-breakpoint
ALTER TABLE app_form_field_options
  ADD CONSTRAINT app_form_field_options_key_unique
    UNIQUE (field_id, key),
  ADD CONSTRAINT app_form_field_options_order_unique
    UNIQUE (field_id, display_order),
  ADD CONSTRAINT app_form_field_options_order_check CHECK (display_order > 0);
--> statement-breakpoint
ALTER TABLE app_form_sections ENABLE TRIGGER app_form_sections_mutability;
--> statement-breakpoint
ALTER TABLE app_form_fields ENABLE TRIGGER app_form_fields_mutability;
