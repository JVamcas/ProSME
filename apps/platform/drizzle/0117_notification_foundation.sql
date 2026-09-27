CREATE TABLE "app_notification_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "display_name" text NOT NULL,
  "channel_type" text NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_channels_type_check"
    CHECK ("channel_type" = 'EMAIL')
);
--> statement-breakpoint
CREATE TABLE "app_notification_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_key" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notification_event_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "recipient_type" text NOT NULL,
  "is_required" boolean DEFAULT true NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_event_rules_recipient_check"
    CHECK ("recipient_type" IN ('APPLICATION_OWNER', 'ASSIGNED_USER'))
);
--> statement-breakpoint
CREATE TABLE "app_notification_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notification_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "source_file_name" text NOT NULL,
  "media_type" text NOT NULL,
  "subject_template" text NOT NULL,
  "html_template" text NOT NULL,
  "plain_text_template" text NOT NULL,
  "content_sha256" text NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "uploaded_by_user_id" uuid NOT NULL,
  "published_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  CONSTRAINT "app_notification_template_versions_number_check"
    CHECK ("version_number" > 0),
  CONSTRAINT "app_notification_template_versions_media_type_check"
    CHECK ("media_type" = 'text/html'),
  CONSTRAINT "app_notification_template_versions_status_check"
    CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
  CONSTRAINT "app_notification_template_versions_digest_check"
    CHECK ("content_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app_notification_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "event_key" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "occurrence_key" text NOT NULL,
  "correlation_id" text NOT NULL,
  "context" jsonb NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error_code" text,
  "last_error_message" text,
  "locked_at" timestamp with time zone,
  "locked_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_outbox_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'PARTIALLY_SENT', 'SENT', 'FAILED')),
  CONSTRAINT "app_notification_outbox_attempt_count_check"
    CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "outbox_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "template_version_id" uuid,
  "recipient_user_id" uuid,
  "recipient_name" text NOT NULL,
  "recipient_email" text NOT NULL,
  "recipient_type" text NOT NULL,
  "resolution_path" text NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "provider_message_id" text,
  "last_error_code" text,
  "last_error_message" text,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_deliveries_recipient_check"
    CHECK ("recipient_type" IN ('APPLICATION_OWNER', 'ASSIGNED_USER')),
  CONSTRAINT "app_notification_deliveries_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  CONSTRAINT "app_notification_deliveries_attempt_count_check"
    CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app_notification_event_rules"
  ADD CONSTRAINT "app_notification_event_rules_event_fk"
  FOREIGN KEY ("event_id") REFERENCES "app_notification_events"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_event_rules"
  ADD CONSTRAINT "app_notification_event_rules_channel_fk"
  FOREIGN KEY ("channel_id") REFERENCES "app_notification_channels"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_templates"
  ADD CONSTRAINT "app_notification_templates_event_fk"
  FOREIGN KEY ("event_id") REFERENCES "app_notification_events"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_templates"
  ADD CONSTRAINT "app_notification_templates_channel_fk"
  FOREIGN KEY ("channel_id") REFERENCES "app_notification_channels"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_versions"
  ADD CONSTRAINT "app_notification_template_versions_template_fk"
  FOREIGN KEY ("template_id") REFERENCES "app_notification_templates"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_versions"
  ADD CONSTRAINT "app_notification_template_versions_uploaded_by_fk"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "app_users"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_versions"
  ADD CONSTRAINT "app_notification_template_versions_published_by_fk"
  FOREIGN KEY ("published_by_user_id") REFERENCES "app_users"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_outbox"
  ADD CONSTRAINT "app_notification_outbox_event_fk"
  FOREIGN KEY ("event_id") REFERENCES "app_notification_events"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_deliveries"
  ADD CONSTRAINT "app_notification_deliveries_outbox_fk"
  FOREIGN KEY ("outbox_id") REFERENCES "app_notification_outbox"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_deliveries"
  ADD CONSTRAINT "app_notification_deliveries_channel_fk"
  FOREIGN KEY ("channel_id") REFERENCES "app_notification_channels"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_deliveries"
  ADD CONSTRAINT "app_notification_deliveries_template_version_fk"
  FOREIGN KEY ("template_version_id")
  REFERENCES "app_notification_template_versions"("id") ON DELETE restrict;
ALTER TABLE "app_notification_deliveries"
  ADD CONSTRAINT "app_notification_deliveries_recipient_user_fk"
  FOREIGN KEY ("recipient_user_id") REFERENCES "app_users"("id")
  ON DELETE set null;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_notification_channels_code_unique"
  ON "app_notification_channels" ("code");
CREATE UNIQUE INDEX "app_notification_events_key_unique"
  ON "app_notification_events" ("event_key");
CREATE UNIQUE INDEX "app_notification_event_rules_target_unique"
  ON "app_notification_event_rules" ("event_id", "channel_id", "recipient_type");
CREATE UNIQUE INDEX "app_notification_templates_target_unique"
  ON "app_notification_templates" ("event_id", "channel_id");
CREATE UNIQUE INDEX "app_notification_template_versions_number_unique"
  ON "app_notification_template_versions" ("template_id", "version_number");
CREATE UNIQUE INDEX "app_notification_template_versions_published_unique"
  ON "app_notification_template_versions" ("template_id")
  WHERE "status" = 'PUBLISHED';
CREATE UNIQUE INDEX "app_notification_outbox_occurrence_unique"
  ON "app_notification_outbox" ("event_key", "occurrence_key");
CREATE INDEX "app_notification_outbox_due_idx"
  ON "app_notification_outbox" ("status", "available_at", "id");
CREATE INDEX "app_notification_outbox_event_history_idx"
  ON "app_notification_outbox" ("event_id", "created_at", "id");
CREATE UNIQUE INDEX "app_notification_deliveries_recipient_unique"
  ON "app_notification_deliveries" ("outbox_id", "channel_id", lower("recipient_email"));
CREATE INDEX "app_notification_deliveries_due_idx"
  ON "app_notification_deliveries" ("status", "next_attempt_at", "id");
CREATE INDEX "app_notification_deliveries_history_idx"
  ON "app_notification_deliveries" ("created_at", "id");
--> statement-breakpoint
CREATE FUNCTION app_prevent_notification_event_key_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_key IS DISTINCT FROM OLD.event_key THEN
    RAISE EXCEPTION 'notification event keys are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_notification_event_key_immutable
BEFORE UPDATE ON "app_notification_events"
FOR EACH ROW EXECUTE FUNCTION app_prevent_notification_event_key_mutation();
--> statement-breakpoint
CREATE FUNCTION app_guard_notification_outbox_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.event_key IS DISTINCT FROM OLD.event_key
    OR NEW.aggregate_type IS DISTINCT FROM OLD.aggregate_type
    OR NEW.aggregate_id IS DISTINCT FROM OLD.aggregate_id
    OR NEW.occurrence_key IS DISTINCT FROM OLD.occurrence_key
    OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
    OR NEW.context IS DISTINCT FROM OLD.context
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notification occurrence identity and context are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_notification_outbox_identity_immutable
BEFORE UPDATE ON "app_notification_outbox"
FOR EACH ROW EXECUTE FUNCTION app_guard_notification_outbox_identity();
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('notifications.configuration.read', 'Read notification channels, events, and recipient rules.'),
  ('notifications.configuration.update', 'Update notification channels, events, and recipient rules.'),
  ('notifications.template.import', 'Import notification template drafts.'),
  ('notifications.template.publish', 'Publish validated notification template versions.'),
  ('notifications.delivery.read', 'Read notification delivery history and recipient details.'),
  ('notifications.delivery.retry', 'Retry failed notification deliveries.')
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'system_administrator'
  AND capability_row."code" IN (
    'notifications.configuration.read',
    'notifications.configuration.update',
    'notifications.template.import',
    'notifications.template.publish',
    'notifications.delivery.read',
    'notifications.delivery.retry'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;

