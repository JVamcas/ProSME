ALTER TABLE "app_funding_calls"
  DROP CONSTRAINT "app_funding_calls_status_check";
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ADD COLUMN "suspended_from_status" text;
--> statement-breakpoint
UPDATE "app_funding_calls"
SET "status" = CASE "status"
  WHEN 'OPEN' THEN 'LIVE'
  WHEN 'CANCELLED' THEN 'WITHDRAWN'
  ELSE "status"
END;
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ADD CONSTRAINT "app_funding_calls_status_check"
  CHECK ("status" IN (
    'DRAFT',
    'APPROVAL_PENDING',
    'APPROVED',
    'SCHEDULED',
    'LIVE',
    'SUSPENDED',
    'CLOSED',
    'WITHDRAWN',
    'ARCHIVED'
  )),
  ADD CONSTRAINT "app_funding_calls_suspended_from_status_check"
  CHECK (
    ("status" = 'SUSPENDED'
      AND "suspended_from_status" IN ('SCHEDULED', 'LIVE'))
    OR ("status" <> 'SUSPENDED' AND "suspended_from_status" IS NULL)
  );
--> statement-breakpoint
CREATE TABLE "app_funding_call_lifecycle_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "funding_call_id" uuid NOT NULL,
  "command" text NOT NULL,
  "source_status" text NOT NULL,
  "target_status" text NOT NULL,
  "actor_id" uuid,
  "system_actor" text,
  "reason" text,
  "command_time" timestamp with time zone NOT NULL,
  "effective_time" timestamp with time zone NOT NULL,
  "row_version" integer NOT NULL,
  "correlation_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  CONSTRAINT "app_funding_call_lifecycle_command_check"
    CHECK ("command" IN (
      'SUBMIT_FOR_APPROVAL',
      'RETURN_FOR_AMENDMENT',
      'APPROVE',
      'PUBLISH',
      'OPEN',
      'SUSPEND',
      'RESUME',
      'CLOSE',
      'WITHDRAW',
      'ARCHIVE'
    )),
  CONSTRAINT "app_funding_call_lifecycle_source_status_check"
    CHECK ("source_status" IN (
      'DRAFT',
      'APPROVAL_PENDING',
      'APPROVED',
      'SCHEDULED',
      'LIVE',
      'SUSPENDED',
      'CLOSED',
      'WITHDRAWN',
      'ARCHIVED'
    )),
  CONSTRAINT "app_funding_call_lifecycle_target_status_check"
    CHECK ("target_status" IN (
      'DRAFT',
      'APPROVAL_PENDING',
      'APPROVED',
      'SCHEDULED',
      'LIVE',
      'SUSPENDED',
      'CLOSED',
      'WITHDRAWN',
      'ARCHIVED'
    )),
  CONSTRAINT "app_funding_call_lifecycle_actor_check"
    CHECK (
      ("actor_id" IS NOT NULL AND "system_actor" IS NULL)
      OR ("actor_id" IS NULL AND length(trim("system_actor")) > 0)
    ),
  CONSTRAINT "app_funding_call_lifecycle_row_version_check"
    CHECK ("row_version" > 1)
);
--> statement-breakpoint
ALTER TABLE "app_funding_call_lifecycle_history"
  ADD CONSTRAINT "app_funding_call_lifecycle_call_fk"
  FOREIGN KEY ("funding_call_id")
  REFERENCES "public"."app_funding_calls"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_lifecycle_actor_fk"
  FOREIGN KEY ("actor_id")
  REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_call_lifecycle_call_time_idx"
  ON "app_funding_call_lifecycle_history"
  ("funding_call_id", "command_time", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_lifecycle_idempotency_unique"
  ON "app_funding_call_lifecycle_history" ("idempotency_key");
