CREATE TABLE "app_authoritative_eligibility_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "eligibility_rule_set_version_id" uuid NOT NULL,
  "rule_set_version_number" integer NOT NULL,
  "evaluated_at" timestamp with time zone NOT NULL,
  "evaluated_by" uuid NOT NULL,
  "context_reference" jsonb NOT NULL,
  "evaluated_values" jsonb NOT NULL,
  "hard_failures" jsonb NOT NULL,
  "soft_failures" jsonb NOT NULL,
  "warnings" jsonb NOT NULL,
  "rule_outcomes" jsonb NOT NULL,
  "eligible" boolean NOT NULL,
  "manual_screening_required" boolean NOT NULL,
  "final_screening_outcome" text,
  CONSTRAINT "app_authoritative_eligibility_outcomes_version_number_check"
    CHECK ("rule_set_version_number" > 0),
  CONSTRAINT "app_authoritative_eligibility_outcomes_final_outcome_check"
    CHECK (
      "final_screening_outcome" IS NULL
      OR "final_screening_outcome" IN ('ELIGIBLE', 'INELIGIBLE')
    ),
  CONSTRAINT "app_authoritative_eligibility_outcomes_result_check"
    CHECK (
      ("final_screening_outcome" = 'INELIGIBLE'
        AND "eligible" = false)
      OR ("final_screening_outcome" = 'ELIGIBLE'
        AND "eligible" = true
        AND "manual_screening_required" = false)
      OR ("final_screening_outcome" IS NULL
        AND "eligible" = true
        AND "manual_screening_required" = true)
    ),
  CONSTRAINT "app_authoritative_eligibility_outcomes_json_check"
    CHECK (
      jsonb_typeof("context_reference") = 'object'
      AND jsonb_typeof("evaluated_values") = 'object'
      AND jsonb_typeof("hard_failures") = 'array'
      AND jsonb_typeof("soft_failures") = 'array'
      AND jsonb_typeof("warnings") = 'array'
      AND jsonb_typeof("rule_outcomes") = 'array'
    ),
  CONSTRAINT "app_authoritative_eligibility_outcomes_findings_check"
    CHECK (
      ("eligible" = (jsonb_array_length("hard_failures") = 0))
      AND (
        "manual_screening_required"
        = (jsonb_array_length("soft_failures") > 0)
      )
    )
);
--> statement-breakpoint
ALTER TABLE "app_authoritative_eligibility_outcomes"
  ADD CONSTRAINT "app_authoritative_eligibility_outcomes_application_fk"
  FOREIGN KEY ("application_id")
  REFERENCES "public"."app_applications"("id")
  ON DELETE cascade ON UPDATE no action,
  ADD CONSTRAINT "app_authoritative_eligibility_outcomes_version_fk"
  FOREIGN KEY ("eligibility_rule_set_version_id")
  REFERENCES "public"."app_eligibility_rule_set_versions"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_authoritative_eligibility_outcomes_evaluated_by_fk"
  FOREIGN KEY ("evaluated_by")
  REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_authoritative_eligibility_outcomes_application_unique"
  ON "app_authoritative_eligibility_outcomes" ("application_id");
--> statement-breakpoint
CREATE INDEX "app_authoritative_eligibility_outcomes_version_idx"
  ON "app_authoritative_eligibility_outcomes"
  ("eligibility_rule_set_version_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_authoritative_eligibility_outcome_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authoritative eligibility outcomes are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "app_authoritative_eligibility_outcomes_immutable"
BEFORE UPDATE OR DELETE ON "app_authoritative_eligibility_outcomes"
FOR EACH ROW EXECUTE FUNCTION prevent_authoritative_eligibility_outcome_mutation();
