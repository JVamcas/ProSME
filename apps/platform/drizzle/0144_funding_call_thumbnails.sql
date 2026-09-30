ALTER TABLE "app_funding_calls"
  ADD COLUMN "thumbnail_content_type" text,
  ADD COLUMN "thumbnail_file_name" text,
  ADD COLUMN "thumbnail_object_key" text;

ALTER TABLE "app_funding_calls"
  ADD CONSTRAINT "app_funding_calls_thumbnail_metadata_check"
  CHECK (
    ("thumbnail_content_type" IS NULL
      AND "thumbnail_file_name" IS NULL
      AND "thumbnail_object_key" IS NULL)
    OR
    ("thumbnail_content_type" IN ('image/jpeg', 'image/png', 'image/webp')
      AND length(trim("thumbnail_file_name")) > 0
      AND length(trim("thumbnail_object_key")) > 0)
  );
