ALTER TABLE "app_authorization_audit_entries"
  ALTER COLUMN "target_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_authorization_audit_entries"
  ADD COLUMN "target_role_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_authorization_audit_entries"
  ADD CONSTRAINT "app_authorization_audit_entries_target_role_fk"
  FOREIGN KEY ("target_role_id") REFERENCES "app_roles"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "app_authorization_audit_created_idx"
  ON "app_authorization_audit_entries" ("created_at", "id");
--> statement-breakpoint
CREATE INDEX "app_user_roles_user_role_idx"
  ON "app_user_roles" ("user_id", "role_id");
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('user.read', 'Read application users and effective access'),
  ('user.manage', 'Promote, invite, and change application-user status'),
  ('role.read', 'Read application roles and capability grants'),
  ('role.manage', 'Assign role membership and capability grants'),
  ('audit.read', 'Read authorization audit events'),
  ('integration.erp.enqueue', 'Enqueue an approved ERP integration event')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'system_administrator'
  AND capability_row."code" IN (
    'user.read', 'user.manage', 'role.read', 'role.manage', 'audit.read'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" IN ('programme_officer', 'approval_panel_member')
  AND capability_row."code" = 'audit.read'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
