ALTER TABLE "app_applications"
  ADD COLUMN "declarations_section" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN "declaration_acceptance" jsonb;
--> statement-breakpoint
UPDATE "app_applications"
SET "section_completion" = "section_completion" ||
  '{"documents":false,"declarations":false}'::jsonb;
--> statement-breakpoint
ALTER TABLE "app_applications"
  ALTER COLUMN "section_completion"
  SET DEFAULT '{"business":false,"project":false,"financial":false,"documents":false,"declarations":false}'::jsonb;
--> statement-breakpoint
ALTER TABLE "app_applications"
  DROP CONSTRAINT "app_applications_current_section_check";
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_current_section_check"
  CHECK ("current_section" IN ('business', 'project', 'financial', 'documents', 'declarations'));
--> statement-breakpoint
CREATE TABLE "app_application_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "document_type" text NOT NULL,
  "object_key" text NOT NULL,
  "original_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" bigint NOT NULL,
  "scan_status" text DEFAULT 'pending' NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_application_documents_type_check"
    CHECK ("document_type" IN (
      'business-registration',
      'financial-statements',
      'project-proposal',
      'tax-clearance',
      'director-identification'
    )),
  CONSTRAINT "app_application_documents_scan_status_check"
    CHECK ("scan_status" IN ('pending', 'clean', 'rejected')),
  CONSTRAINT "app_application_documents_size_check"
    CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760)
);
--> statement-breakpoint
ALTER TABLE "app_application_documents"
  ADD CONSTRAINT "app_application_documents_application_id_app_applications_id_fk"
  FOREIGN KEY ("application_id") REFERENCES "public"."app_applications"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app_application_documents"
  ADD CONSTRAINT "app_application_documents_owner_user_id_app_users_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_application_documents_type_unique"
  ON "app_application_documents" USING btree ("application_id", "document_type");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_application_documents_object_key_unique"
  ON "app_application_documents" USING btree ("object_key");
--> statement-breakpoint
CREATE INDEX "app_application_documents_owner_application_idx"
  ON "app_application_documents" USING btree ("owner_user_id", "application_id");
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('application.submit', 'Submit an owned application'),
  ('document.read.own', 'Read own application documents'),
  ('document.upload.own', 'Upload own application documents')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'applicant'
  AND capability_row."code" IN (
    'application.submit',
    'document.read.own',
    'document.upload.own'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
