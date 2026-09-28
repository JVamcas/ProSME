DROP TABLE IF EXISTS "app_notification_deliveries" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_outbox" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_template_versions" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_template_targets" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_templates" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_event_rule_channels" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_event_rule_recipients" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_event_rules" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_events" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_catalogs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "app_notification_channels" CASCADE;
--> statement-breakpoint
CREATE TABLE "app_notification_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "display_name" text NOT NULL,
  "channel_type" text NOT NULL,
  "sort_order" integer DEFAULT 10 NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_channels_type_check"
    CHECK ("channel_type" = 'EMAIL')
);
--> statement-breakpoint
CREATE TABLE "app_notification_catalogs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "catalog_key" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text NOT NULL,
  "sort_order" integer DEFAULT 10 NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notification_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "catalog_id" uuid NOT NULL,
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
  "description" text NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notification_event_rule_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_id" uuid NOT NULL,
  "recipient_type" text NOT NULL,
  "is_required" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_event_rule_recipients_type_check"
    CHECK ("recipient_type" IN ('APPLICATION_OWNER', 'ASSIGNED_USER'))
);
--> statement-breakpoint
CREATE TABLE "app_notification_event_rule_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_recipient_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notification_template_targets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "scope" text NOT NULL,
  "catalog_id" uuid,
  "event_id" uuid,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_notification_template_targets_scope_check" CHECK (
    ("scope" = 'GLOBAL' AND "catalog_id" IS NULL AND "event_id" IS NULL)
    OR ("scope" = 'CATALOG' AND "catalog_id" IS NOT NULL AND "event_id" IS NULL)
    OR ("scope" = 'EVENT' AND "catalog_id" IS NULL AND "event_id" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "app_notification_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_target_id" uuid NOT NULL,
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
ALTER TABLE "app_notification_event_rule_recipients"
  ADD CONSTRAINT "app_notification_event_rule_recipients_rule_fk"
  FOREIGN KEY ("rule_id") REFERENCES "app_notification_event_rules"("id")
  ON DELETE cascade;
ALTER TABLE "app_notification_event_rule_channels"
  ADD CONSTRAINT "app_notification_event_rule_channels_recipient_fk"
  FOREIGN KEY ("rule_recipient_id")
  REFERENCES "app_notification_event_rule_recipients"("id")
  ON DELETE cascade;
ALTER TABLE "app_notification_event_rule_channels"
  ADD CONSTRAINT "app_notification_event_rule_channels_channel_fk"
  FOREIGN KEY ("channel_id") REFERENCES "app_notification_channels"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_events"
  ADD CONSTRAINT "app_notification_events_catalog_fk"
  FOREIGN KEY ("catalog_id") REFERENCES "app_notification_catalogs"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_targets"
  ADD CONSTRAINT "app_notification_template_targets_channel_fk"
  FOREIGN KEY ("channel_id") REFERENCES "app_notification_channels"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_targets"
  ADD CONSTRAINT "app_notification_template_targets_catalog_fk"
  FOREIGN KEY ("catalog_id") REFERENCES "app_notification_catalogs"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_targets"
  ADD CONSTRAINT "app_notification_template_targets_event_fk"
  FOREIGN KEY ("event_id") REFERENCES "app_notification_events"("id")
  ON DELETE restrict;
ALTER TABLE "app_notification_template_versions"
  ADD CONSTRAINT "app_notification_template_versions_target_fk"
  FOREIGN KEY ("template_target_id")
  REFERENCES "app_notification_template_targets"("id")
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
CREATE UNIQUE INDEX "app_notification_catalogs_key_unique"
  ON "app_notification_catalogs" ("catalog_key");
CREATE UNIQUE INDEX "app_notification_events_key_unique"
  ON "app_notification_events" ("event_key");
CREATE UNIQUE INDEX "app_notification_event_rules_event_unique"
  ON "app_notification_event_rules" ("event_id");
CREATE UNIQUE INDEX "app_notification_event_rule_recipients_target_unique"
  ON "app_notification_event_rule_recipients" ("rule_id", "recipient_type");
CREATE UNIQUE INDEX "app_notification_event_rule_channels_target_unique"
  ON "app_notification_event_rule_channels" ("rule_recipient_id", "channel_id");
CREATE UNIQUE INDEX "app_notification_template_targets_global_unique"
  ON "app_notification_template_targets" ("channel_id")
  WHERE "scope" = 'GLOBAL';
CREATE UNIQUE INDEX "app_notification_template_targets_catalog_unique"
  ON "app_notification_template_targets" ("channel_id", "catalog_id")
  WHERE "scope" = 'CATALOG';
CREATE UNIQUE INDEX "app_notification_template_targets_event_unique"
  ON "app_notification_template_targets" ("channel_id", "event_id")
  WHERE "scope" = 'EVENT';
CREATE UNIQUE INDEX "app_notification_template_versions_number_unique"
  ON "app_notification_template_versions" ("template_target_id", "version_number");
CREATE UNIQUE INDEX "app_notification_template_versions_published_unique"
  ON "app_notification_template_versions" ("template_target_id")
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
CREATE OR REPLACE FUNCTION app_prevent_notification_event_key_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_key IS DISTINCT FROM OLD.event_key
    OR NEW.catalog_id IS DISTINCT FROM OLD.catalog_id THEN
    RAISE EXCEPTION 'notification event identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_notification_event_key_immutable
BEFORE UPDATE ON "app_notification_events"
FOR EACH ROW EXECUTE FUNCTION app_prevent_notification_event_key_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_prevent_notification_catalog_key_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.catalog_key IS DISTINCT FROM OLD.catalog_key THEN
    RAISE EXCEPTION 'notification catalog keys are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_notification_catalog_key_immutable
BEFORE UPDATE ON "app_notification_catalogs"
FOR EACH ROW EXECUTE FUNCTION app_prevent_notification_catalog_key_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_prevent_notification_template_target_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.channel_id IS DISTINCT FROM OLD.channel_id
    OR NEW.scope IS DISTINCT FROM OLD.scope
    OR NEW.catalog_id IS DISTINCT FROM OLD.catalog_id
    OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'notification template target identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_notification_template_target_identity_immutable
BEFORE UPDATE ON "app_notification_template_targets"
FOR EACH ROW EXECUTE FUNCTION app_prevent_notification_template_target_identity_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_guard_notification_outbox_identity()
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
