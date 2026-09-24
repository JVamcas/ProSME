ALTER TABLE "app_application_audit_entries"
  DROP CONSTRAINT "app_application_audit_entries_action_check",
  ADD CONSTRAINT "app_application_audit_entries_action_check"
    CHECK ("action" IN (
      'APPLICATION_DRAFT_CREATED',
      'APPLICATION_DRAFT_SAVED',
      'APPLICATION_DRAFT_DELETED',
      'APPLICATION_SUBMITTED',
      'APPLICATION_REFERENCE_ALLOCATED',
      'APPLICATION_SNAPSHOT_CREATED',
      'APPLICATION_WORKFLOW_BOOTSTRAPPED',
      'APPLICATION_WITHDRAWN',
      'SUBMISSION_SNAPSHOT_ACCESSED'
    ));
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description")
VALUES (
  'funding.application.own.withdraw',
  'Withdraw a submitted application owned by the signed-in user when its workflow permits withdrawal.'
)
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT existing."role_id", withdraw_permission."id"
FROM "app_role_capabilities" existing
JOIN "app_capabilities" submit_permission
  ON submit_permission."id" = existing."capability_id"
  AND submit_permission."code" = 'funding.application.submit'
JOIN "app_capabilities" withdraw_permission
  ON withdraw_permission."code" = 'funding.application.own.withdraw'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
