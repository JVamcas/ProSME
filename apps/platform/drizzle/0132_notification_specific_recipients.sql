ALTER TABLE "app_notification_event_rule_recipients"
  ADD COLUMN "recipient_user_id" uuid,
  ADD COLUMN "recipient_role_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_notification_event_rule_recipients"
  DROP CONSTRAINT "app_notification_event_rule_recipients_type_check";
--> statement-breakpoint
DROP INDEX "app_notification_event_rule_recipients_target_unique";
--> statement-breakpoint
ALTER TABLE "app_notification_event_rule_recipients"
  ADD CONSTRAINT "app_notification_event_rule_recipients_user_fk"
  FOREIGN KEY ("recipient_user_id") REFERENCES "app_users"("id") ON DELETE restrict,
  ADD CONSTRAINT "app_notification_event_rule_recipients_role_fk"
  FOREIGN KEY ("recipient_role_id") REFERENCES "app_roles"("id") ON DELETE restrict,
  ADD CONSTRAINT "app_notification_event_rule_recipients_type_check"
  CHECK ("recipient_type" IN (
    'APPLICATION_OWNER', 'ASSIGNED_USER', 'SPECIFIC_USER', 'SPECIFIC_ROLE'
  )),
  ADD CONSTRAINT "app_notification_event_rule_recipients_target_check"
  CHECK (
    ("recipient_type" IN ('APPLICATION_OWNER', 'ASSIGNED_USER')
      AND "recipient_user_id" IS NULL AND "recipient_role_id" IS NULL)
    OR ("recipient_type" = 'SPECIFIC_USER'
      AND "recipient_user_id" IS NOT NULL AND "recipient_role_id" IS NULL)
    OR ("recipient_type" = 'SPECIFIC_ROLE'
      AND "recipient_user_id" IS NULL AND "recipient_role_id" IS NOT NULL)
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "app_notification_event_rule_recipients_dynamic_unique"
  ON "app_notification_event_rule_recipients" ("rule_id", "recipient_type")
  WHERE "recipient_type" IN ('APPLICATION_OWNER', 'ASSIGNED_USER');
--> statement-breakpoint
CREATE UNIQUE INDEX "app_notification_event_rule_recipients_user_unique"
  ON "app_notification_event_rule_recipients"
  ("rule_id", "recipient_type", "recipient_user_id")
  WHERE "recipient_type" = 'SPECIFIC_USER';
--> statement-breakpoint
CREATE UNIQUE INDEX "app_notification_event_rule_recipients_role_unique"
  ON "app_notification_event_rule_recipients"
  ("rule_id", "recipient_type", "recipient_role_id")
  WHERE "recipient_type" = 'SPECIFIC_ROLE';
--> statement-breakpoint
ALTER TABLE "app_notification_deliveries"
  DROP CONSTRAINT "app_notification_deliveries_recipient_check";
--> statement-breakpoint
ALTER TABLE "app_notification_deliveries"
  ADD CONSTRAINT "app_notification_deliveries_recipient_check"
  CHECK ("recipient_type" IN (
    'APPLICATION_OWNER', 'ASSIGNED_USER', 'SPECIFIC_USER', 'SPECIFIC_ROLE'
  ));
