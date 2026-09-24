ALTER TABLE app_form_sections
  ADD COLUMN column_span integer NOT NULL DEFAULT 3,
  ADD CONSTRAINT app_form_sections_column_span_check
    CHECK (column_span IN (1, 2, 3));
