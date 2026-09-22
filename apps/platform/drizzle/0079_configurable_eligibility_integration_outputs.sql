CREATE TABLE "app_eligibility_integration_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stable_key" text NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_integration_definitions_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_integrations_stable_key_unique"
  ON "app_eligibility_integration_definitions" ("stable_key");
--> statement-breakpoint
CREATE TABLE "app_eligibility_integration_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "definition_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "output_schema" jsonb NOT NULL,
  "retry_policy" jsonb NOT NULL,
  "raw_response_policy" jsonb NOT NULL,
  "created_by" uuid NOT NULL,
  "published_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  "retired_at" timestamp with time zone,
  CONSTRAINT "app_eligibility_integration_versions_definition_fk"
    FOREIGN KEY ("definition_id")
    REFERENCES "app_eligibility_integration_definitions"("id")
    ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_versions_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_versions_published_by_fk"
    FOREIGN KEY ("published_by") REFERENCES "app_users"("id") ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_versions_status_check"
    CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
  CONSTRAINT "app_eligibility_integration_versions_number_check"
    CHECK ("version_number" > 0),
  CONSTRAINT "app_eligibility_integration_versions_outputs_check"
    CHECK (jsonb_typeof("output_schema") = 'array'
      AND jsonb_array_length("output_schema") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_integration_versions_number_unique"
  ON "app_eligibility_integration_versions" ("definition_id", "version_number");
--> statement-breakpoint
CREATE INDEX "app_eligibility_integration_versions_status_idx"
  ON "app_eligibility_integration_versions" ("status");
--> statement-breakpoint
CREATE TABLE "app_funding_call_eligibility_integration_bindings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "funding_call_id" uuid NOT NULL,
  "workflow_template_version_id" uuid NOT NULL,
  "integration_version_id" uuid NOT NULL,
  "manual_fallback_allowed" boolean DEFAULT false NOT NULL,
  "provider_adapter_key" text NOT NULL,
  "provider_display_name" text NOT NULL,
  "secret_reference" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_funding_call_eligibility_integration_call_fk"
    FOREIGN KEY ("funding_call_id") REFERENCES "app_funding_calls"("id")
    ON DELETE restrict,
  CONSTRAINT "app_funding_call_eligibility_integration_workflow_fk"
    FOREIGN KEY ("workflow_template_version_id")
    REFERENCES "app_workflow_definition_versions"("id") ON DELETE restrict,
  CONSTRAINT "app_funding_call_eligibility_integration_version_fk"
    FOREIGN KEY ("integration_version_id")
    REFERENCES "app_eligibility_integration_versions"("id") ON DELETE restrict,
  CONSTRAINT "app_funding_call_eligibility_integration_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_integration_version_unique"
  ON "app_funding_call_eligibility_integration_bindings"
  ("funding_call_id", "integration_version_id");
--> statement-breakpoint
CREATE INDEX "app_funding_call_integration_workflow_idx"
  ON "app_funding_call_eligibility_integration_bindings"
  ("workflow_template_version_id");
--> statement-breakpoint
CREATE TABLE "app_eligibility_integration_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "binding_id" uuid NOT NULL,
  "status" text NOT NULL,
  "execution_source" text NOT NULL,
  "attempt_count" integer NOT NULL,
  "normalized_outputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "raw_response" jsonb,
  "raw_response_expires_at" timestamp with time zone,
  "failure_message" text,
  "evidence_reference" text,
  "executed_by" uuid,
  "executed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_integration_execution_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_execution_binding_fk"
    FOREIGN KEY ("binding_id")
    REFERENCES "app_funding_call_eligibility_integration_bindings"("id")
    ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_execution_user_fk"
    FOREIGN KEY ("executed_by") REFERENCES "app_users"("id")
    ON DELETE restrict,
  CONSTRAINT "app_eligibility_integration_execution_status_check"
    CHECK ("status" IN ('SUCCEEDED', 'NEGATIVE', 'UNAVAILABLE', 'TIMED_OUT')),
  CONSTRAINT "app_eligibility_integration_execution_source_check"
    CHECK ("execution_source" IN ('PROVIDER', 'MANUAL')),
  CONSTRAINT "app_eligibility_integration_execution_attempts_check"
    CHECK ("attempt_count" > 0),
  CONSTRAINT "app_eligibility_integration_execution_manual_check"
    CHECK (("execution_source" = 'MANUAL'
        AND "executed_by" IS NOT NULL
        AND length(btrim("evidence_reference")) > 0)
      OR ("execution_source" = 'PROVIDER'
        AND "executed_by" IS NULL
        AND "evidence_reference" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "app_eligibility_integration_execution_latest_idx"
  ON "app_eligibility_integration_executions"
  ("application_id", "binding_id", "executed_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_published_eligibility_integration_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED', 'RETIRED') THEN
    IF NEW IS DISTINCT FROM OLD THEN
      RAISE EXCEPTION 'Published eligibility integration versions are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER app_eligibility_integration_versions_immutable
BEFORE UPDATE ON "app_eligibility_integration_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_published_eligibility_integration_change();
--> statement-breakpoint
INSERT INTO app_capabilities (code, description)
VALUES
  ('integration.eligibility.read',
    'Read eligibility integration definitions and versions.'),
  ('integration.eligibility.create',
    'Create eligibility integration definitions and draft versions.'),
  ('integration.eligibility.publish',
    'Publish eligibility integration versions.'),
  ('integration.eligibility.bind',
    'Bind eligibility integrations to Funding Calls.'),
  ('integration.eligibility.execute',
    'Execute a bound eligibility integration.'),
  ('integration.eligibility.manual-verify',
    'Record an allowed manual eligibility integration result.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
