ALTER TABLE "app_form_fields" ADD COLUMN "max_pages" integer;
--> statement-breakpoint
ALTER TABLE "app_form_fields" ADD COLUMN "maximum_file_size_mb" integer;
--> statement-breakpoint
ALTER TABLE "app_form_fields" ADD CONSTRAINT "app_form_fields_document_limits_check"
CHECK (("max_pages" IS NULL AND "maximum_file_size_mb" IS NULL)
  OR ("type" = 'DOCUMENT'
    AND ("max_pages" IS NULL OR "max_pages" > 0)
    AND ("maximum_file_size_mb" IS NULL OR "maximum_file_size_mb" BETWEEN 1 AND 10)));
