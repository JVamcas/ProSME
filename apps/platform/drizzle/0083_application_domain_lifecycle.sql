ALTER TABLE "app_funding_calls"
  ADD COLUMN "application_duplicate_policy" text
    DEFAULT 'one_per_business' NOT NULL,
  ADD CONSTRAINT "app_funding_calls_application_duplicate_policy_check"
    CHECK ("application_duplicate_policy" IN (
      'one_per_applicant', 'one_per_business', 'none'
    ));
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_applications_submission_identity_immutable
  ON "app_applications";
--> statement-breakpoint
DROP FUNCTION IF EXISTS prevent_submitted_application_identity_change();
--> statement-breakpoint
ALTER TABLE "app_applications"
  DROP CONSTRAINT IF EXISTS "app_applications_status_check",
  DROP CONSTRAINT IF EXISTS "app_applications_submission_fields_check",
  DROP CONSTRAINT IF EXISTS "app_applications_workflow_version_fk",
  ADD COLUMN "duplicate_policy" text DEFAULT 'one_per_business' NOT NULL,
  ADD COLUMN "latest_draft_response_id" uuid,
  ADD COLUMN "submission_snapshot_id" uuid,
  ADD COLUMN "withdrawn_at" timestamp with time zone,
  ADD CONSTRAINT "app_applications_funding_call_fk"
    FOREIGN KEY ("funding_opportunity_id")
    REFERENCES "app_funding_calls"("id") ON DELETE restrict,
  ADD CONSTRAINT "app_applications_status_check"
    CHECK ("status" IN ('draft', 'submitted', 'withdrawn')),
  ADD CONSTRAINT "app_applications_duplicate_policy_check"
    CHECK ("duplicate_policy" IN (
      'one_per_applicant', 'one_per_business', 'none'
    )),
  ADD CONSTRAINT "app_applications_row_version_check"
    CHECK ("row_version" > 0),
  ADD CONSTRAINT "app_applications_lifecycle_timestamps_check"
    CHECK (
      ("status" = 'draft' AND "submitted_at" IS NULL
        AND "withdrawn_at" IS NULL AND "reference" IS NULL
        AND "submission_snapshot_id" IS NULL)
      OR
      ("status" = 'submitted' AND "submitted_at" IS NOT NULL
        AND "withdrawn_at" IS NULL AND "reference" IS NOT NULL)
      OR
      ("status" = 'withdrawn' AND "submitted_at" IS NOT NULL
        AND "withdrawn_at" IS NOT NULL AND "reference" IS NOT NULL)
    );
--> statement-breakpoint
ALTER TABLE "app_applications" DROP COLUMN "workflow_version_id";
--> statement-breakpoint
DROP INDEX "app_applications_business_opportunity_unique";
--> statement-breakpoint
DROP INDEX "app_applications_unassigned_draft_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_business_opportunity_unique"
  ON "app_applications" ("business_id", "funding_opportunity_id")
  WHERE "duplicate_policy" = 'one_per_business'
    AND "business_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_applicant_opportunity_unique"
  ON "app_applications" ("owner_user_id", "funding_opportunity_id")
  WHERE "duplicate_policy" = 'one_per_applicant';
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_unassigned_draft_unique"
  ON "app_applications" ("owner_user_id", "funding_opportunity_id")
  WHERE "duplicate_policy" = 'one_per_business'
    AND "business_id" IS NULL AND "status" = 'draft';
--> statement-breakpoint
CREATE TABLE "app_application_lifecycle_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "source_status" text NOT NULL,
  "target_status" text NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "reason" text,
  "source_row_version" integer NOT NULL,
  "resulting_row_version" integer NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  CONSTRAINT "app_application_lifecycle_history_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_lifecycle_history_actor_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_lifecycle_history_status_check"
    CHECK (
      "source_status" IN ('draft', 'submitted', 'withdrawn')
      AND "target_status" IN ('draft', 'submitted', 'withdrawn')
    ),
  CONSTRAINT "app_application_lifecycle_history_version_check"
    CHECK (
      "source_row_version" > 0
      AND "resulting_row_version" = "source_row_version" + 1
    )
);
--> statement-breakpoint
CREATE INDEX "app_application_lifecycle_history_application_idx"
  ON "app_application_lifecycle_history" (
    "application_id", "occurred_at", "id"
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_application_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."owner_user_id" IS DISTINCT FROM OLD."owner_user_id"
    OR NEW."funding_opportunity_id" IS DISTINCT FROM OLD."funding_opportunity_id"
    OR NEW."form_version_id" IS DISTINCT FROM OLD."form_version_id"
    OR NEW."eligibility_rule_set_version_id" IS DISTINCT FROM OLD."eligibility_rule_set_version_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
    OR NEW."row_version" <> OLD."row_version" + 1 THEN
    RAISE EXCEPTION 'application identity or concurrency version is invalid';
  END IF;

  IF OLD."status" = 'draft' AND NEW."status" NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'invalid application lifecycle transition';
  ELSIF OLD."status" = 'submitted'
    AND NEW."status" NOT IN ('submitted', 'withdrawn') THEN
    RAISE EXCEPTION 'invalid application lifecycle transition';
  ELSIF OLD."status" = 'withdrawn' AND NEW."status" <> 'withdrawn' THEN
    RAISE EXCEPTION 'invalid application lifecycle transition';
  END IF;

  IF OLD."status" <> 'draft' AND (
    NEW."business_id" IS DISTINCT FROM OLD."business_id"
    OR NEW."reference" IS DISTINCT FROM OLD."reference"
    OR NEW."submitted_at" IS DISTINCT FROM OLD."submitted_at"
    OR NEW."latest_draft_response_id" IS DISTINCT FROM OLD."latest_draft_response_id"
    OR (
      OLD."submission_snapshot_id" IS NOT NULL
      AND NEW."submission_snapshot_id" IS DISTINCT FROM OLD."submission_snapshot_id"
    )
  ) THEN
    RAISE EXCEPTION 'lodged application identity is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_applications_lifecycle_guard
BEFORE UPDATE ON "app_applications"
FOR EACH ROW EXECUTE FUNCTION protect_application_lifecycle();
