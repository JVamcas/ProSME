ALTER TABLE "app_application_documents"
  RENAME TO "app_application_document_versions";
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  RENAME COLUMN "document_type" TO "requirement_key";
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  DROP CONSTRAINT IF EXISTS "app_application_documents_type_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_application_documents_type_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_application_documents_object_key_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_application_documents_owner_application_idx";
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  ADD COLUMN "version_number" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "extension" text,
  ADD COLUMN "checksum_sha256" text,
  ADD COLUMN "storage_status" text DEFAULT 'finalized' NOT NULL,
  ADD COLUMN "failure_code" text,
  ADD COLUMN "finalized_at" timestamp with time zone,
  ADD COLUMN "scanned_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "app_application_document_versions"
SET "requirement_key" = upper(regexp_replace("requirement_key", '[^A-Za-z0-9]+', '_', 'g')),
    "extension" = lower(substring("original_name" from '(\.[A-Za-z0-9]+)$')),
    "checksum_sha256" = md5("object_key") || md5('legacy:' || "object_key"),
    "finalized_at" = "uploaded_at",
    "scanned_at" = CASE
      WHEN "scan_status" = 'pending' THEN NULL
      ELSE "uploaded_at"
    END;
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  ALTER COLUMN "extension" SET NOT NULL,
  ALTER COLUMN "checksum_sha256" SET NOT NULL,
  ALTER COLUMN "storage_status" SET DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  ADD CONSTRAINT "app_document_version_requirement_key_check"
    CHECK ("requirement_key" ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  ADD CONSTRAINT "app_document_version_number_check"
    CHECK ("version_number" > 0),
  ADD CONSTRAINT "app_document_version_size_check"
    CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760),
  ADD CONSTRAINT "app_document_version_checksum_check"
    CHECK ("checksum_sha256" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "app_document_version_storage_status_check"
    CHECK ("storage_status" IN ('pending', 'finalized', 'failed', 'abandoned')),
  ADD CONSTRAINT "app_document_version_scan_status_check"
    CHECK ("scan_status" IN ('pending', 'clean', 'rejected')),
  ADD CONSTRAINT "app_document_version_finalization_check"
    CHECK (("storage_status" = 'finalized' AND "finalized_at" IS NOT NULL)
      OR "storage_status" <> 'finalized'),
  ADD CONSTRAINT "app_document_version_scan_time_check"
    CHECK (("scan_status" = 'pending' AND "scanned_at" IS NULL)
      OR ("scan_status" <> 'pending' AND "scanned_at" IS NOT NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX "app_document_version_number_unique"
  ON "app_application_document_versions"
  ("application_id", "requirement_key", "version_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_document_version_object_key_unique"
  ON "app_application_document_versions" ("object_key");
--> statement-breakpoint
CREATE INDEX "app_document_version_owner_application_idx"
  ON "app_application_document_versions" ("owner_user_id", "application_id");
--> statement-breakpoint
CREATE INDEX "app_document_version_cleanup_idx"
  ON "app_application_document_versions" ("storage_status", "uploaded_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_prevent_document_version_content_update()
RETURNS trigger AS $$
BEGIN
  IF (NEW.application_id, NEW.owner_user_id, NEW.requirement_key,
      NEW.version_number, NEW.object_key, NEW.original_name, NEW.content_type,
      NEW.extension, NEW.size_bytes, NEW.checksum_sha256, NEW.uploaded_at)
    IS DISTINCT FROM
     (OLD.application_id, OLD.owner_user_id, OLD.requirement_key,
      OLD.version_number, OLD.object_key, OLD.original_name, OLD.content_type,
      OLD.extension, OLD.size_bytes, OLD.checksum_sha256, OLD.uploaded_at)
  THEN
    RAISE EXCEPTION 'application document version content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_application_document_version_immutable
BEFORE UPDATE ON "app_application_document_versions"
FOR EACH ROW EXECUTE FUNCTION app_prevent_document_version_content_update();
