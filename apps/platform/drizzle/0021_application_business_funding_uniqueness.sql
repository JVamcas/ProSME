ALTER TABLE "app_applications"
  ADD COLUMN "business_id" uuid;
--> statement-breakpoint
UPDATE "app_applications"
SET "business_id" = ("business_section" ->> 'businessId')::uuid
WHERE NULLIF("business_section" ->> 'businessId', '') IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_business_id_app_business_profiles_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "app_business_profiles"("id")
  ON DELETE restrict;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_submitted_application_identity_change()
RETURNS trigger AS $$
BEGIN
  IF OLD."reference" IS NOT NULL AND (
    NEW."reference" IS DISTINCT FROM OLD."reference"
    OR NEW."workflow_version_id" IS DISTINCT FROM OLD."workflow_version_id"
    OR NEW."submitted_at" IS DISTINCT FROM OLD."submitted_at"
    OR NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."business_id" IS DISTINCT FROM OLD."business_id"
  ) THEN
    RAISE EXCEPTION 'submitted application identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP INDEX "app_applications_owner_opportunity_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_business_opportunity_unique"
  ON "app_applications" ("business_id", "funding_opportunity_id")
  WHERE "business_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_unassigned_draft_unique"
  ON "app_applications" ("owner_user_id", "funding_opportunity_id")
  WHERE "business_id" IS NULL AND "status" = 'draft';
