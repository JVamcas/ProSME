ALTER TABLE "app_application_document_versions"
  DROP CONSTRAINT IF EXISTS "app_document_version_scan_time_check",
  DROP CONSTRAINT IF EXISTS "app_document_version_scan_status_check";
--> statement-breakpoint
ALTER TABLE "app_application_document_versions"
  DROP COLUMN "scan_status",
  DROP COLUMN "scanned_at";
