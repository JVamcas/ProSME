ALTER TABLE app_form_fields
  ADD COLUMN minimum double precision,
  ADD COLUMN maximum double precision,
  ADD COLUMN min_length integer,
  ADD COLUMN max_length integer,
  ADD CONSTRAINT app_form_fields_number_limits_check
    CHECK (
      (minimum IS NULL AND maximum IS NULL)
      OR (
        type = 'NUMBER'
        AND (minimum IS NULL OR maximum IS NULL OR minimum <= maximum)
      )
    ),
  ADD CONSTRAINT app_form_fields_length_limits_check
    CHECK (
      (min_length IS NULL AND max_length IS NULL)
      OR (
        type IN ('TEXT', 'TEXTAREA')
        AND coalesce(min_length, 0) >= 0
        AND coalesce(max_length, 0) >= 0
        AND (min_length IS NULL OR max_length IS NULL OR min_length <= max_length)
      )
    );
