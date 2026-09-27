INSERT INTO "app_capabilities" ("code", "description") VALUES
  (
    'funding.application.information-request.create',
    'Create an information request from an assigned workflow task.'
  ),
  (
    'funding.application.information-request.assigned.close',
    'Close an information request for an assigned workflow task.'
  ),
  (
    'funding.application.information-request.own.read',
    'Read information requests for an owned funding application.'
  ),
  (
    'funding.application.information-request.own.respond',
    'Respond to information requests for an owned funding application.'
  )
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT DISTINCT existing."role_id", target_permission."id"
FROM "app_role_capabilities" existing
JOIN "app_capabilities" source_permission
  ON source_permission."id" = existing."capability_id"
  AND source_permission."code" = 'funding.application.own.read'
JOIN "app_capabilities" target_permission
  ON target_permission."code" IN (
    'funding.application.information-request.own.read',
    'funding.application.information-request.own.respond'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT DISTINCT existing."role_id", target_permission."id"
FROM "app_role_capabilities" existing
JOIN "app_capabilities" source_permission
  ON source_permission."id" = existing."capability_id"
  AND source_permission."code" = 'workflow.task.assigned.process'
JOIN "app_capabilities" target_permission
  ON target_permission."code" IN (
    'funding.application.information-request.create',
    'funding.application.information-request.assigned.close'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
