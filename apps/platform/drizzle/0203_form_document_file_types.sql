ALTER TABLE "app_form_fields" ADD COLUMN "accepted_extensions" text[];
--> statement-breakpoint
ALTER TABLE "app_form_fields" ADD CONSTRAINT "app_form_fields_document_extensions_check"
CHECK ("accepted_extensions" IS NULL OR (
  "type" = 'DOCUMENT'
  AND cardinality("accepted_extensions") > 0
  AND "accepted_extensions" <@ ARRAY[
    '.pdf', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.jpg', '.jpeg', '.png'
  ]::text[]
  AND ("max_pages" IS NULL OR "accepted_extensions" = ARRAY['.pdf']::text[])
));
