ALTER TABLE "app_applications"
  ADD COLUMN "deleted_at" timestamptz,
  ADD CONSTRAINT "app_applications_deleted_draft_check"
    CHECK ("deleted_at" IS NULL OR "status" = 'draft');
--> statement-breakpoint
DROP INDEX "app_applications_business_opportunity_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_business_opportunity_unique"
  ON "app_applications" ("business_id", "funding_opportunity_id")
  WHERE "deleted_at" IS NULL
    AND "duplicate_policy" = 'one_per_business'
    AND "business_id" IS NOT NULL;
--> statement-breakpoint
DROP INDEX "app_applications_applicant_opportunity_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_applicant_opportunity_unique"
  ON "app_applications" ("owner_user_id", "funding_opportunity_id")
  WHERE "deleted_at" IS NULL
    AND "duplicate_policy" = 'one_per_applicant';
--> statement-breakpoint
DROP INDEX "app_applications_unassigned_draft_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_unassigned_draft_unique"
  ON "app_applications" ("owner_user_id", "funding_opportunity_id")
  WHERE "deleted_at" IS NULL
    AND "duplicate_policy" = 'one_per_business'
    AND "business_id" IS NULL
    AND "status" = 'draft';
--> statement-breakpoint
ALTER TABLE "app_application_audit_entries"
  DROP CONSTRAINT "app_application_audit_entries_action_check",
  ADD CONSTRAINT "app_application_audit_entries_action_check"
    CHECK ("action" IN (
      'APPLICATION_DRAFT_CREATED',
      'APPLICATION_DRAFT_SAVED',
      'APPLICATION_DRAFT_DELETED',
      'APPLICATION_SUBMITTED',
      'SUBMISSION_SNAPSHOT_ACCESSED'
    ));
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description")
VALUES (
  'funding.application.draft.own.delete',
  'Delete an unsubmitted funding application draft owned by the signed-in user.'
)
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT existing."role_id", delete_permission."id"
FROM "app_role_capabilities" existing
JOIN "app_capabilities" update_permission
  ON update_permission."id" = existing."capability_id"
  AND update_permission."code" = 'funding.application.own.update'
JOIN "app_capabilities" delete_permission
  ON delete_permission."code" = 'funding.application.draft.own.delete'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
