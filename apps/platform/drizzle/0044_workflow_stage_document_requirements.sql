CREATE TABLE "app_workflow_stage_document_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL,
  "name" text NOT NULL,
  "mandatory" boolean DEFAULT false NOT NULL,
  "accepted_file_types" jsonb NOT NULL,
  "maximum_size_mb" integer NOT NULL,
  "expiry_days" integer,
  "uploader" text NOT NULL,
  "verifier" text NOT NULL,
  "template_reference" text DEFAULT '' NOT NULL,
  CONSTRAINT "app_stage_documents_file_types_check"
    CHECK (
      jsonb_typeof("accepted_file_types") = 'array'
      AND jsonb_array_length("accepted_file_types") > 0
      AND "accepted_file_types" <@ '["PDF", "JPG", "PNG", "DOCX"]'::jsonb
    ),
  CONSTRAINT "app_stage_documents_maximum_size_check"
    CHECK ("maximum_size_mb" BETWEEN 1 AND 100),
  CONSTRAINT "app_stage_documents_expiry_check"
    CHECK ("expiry_days" IS NULL OR "expiry_days" BETWEEN 1 AND 3650),
  CONSTRAINT "app_stage_documents_uploader_check"
    CHECK ("uploader" IN ('APPLICANT', 'ASSIGNED_REVIEWER', 'STAFF')),
  CONSTRAINT "app_stage_documents_verifier_check"
    CHECK ("verifier" IN ('ASSIGNED_REVIEWER', 'STAFF'))
);
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_document_requirements"
  ADD CONSTRAINT "app_stage_documents_stage_fk"
  FOREIGN KEY ("stage_id")
  REFERENCES "public"."app_workflow_stage_definitions"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_documents_stage_name_unique"
  ON "app_workflow_stage_document_requirements" USING btree ("stage_id", "name");
--> statement-breakpoint
CREATE INDEX "app_stage_documents_stage_idx"
  ON "app_workflow_stage_document_requirements" USING btree ("stage_id");
