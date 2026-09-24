ALTER TABLE "app_funding_call_lifecycle_history"
  DROP CONSTRAINT "app_funding_call_lifecycle_command_check",
  ADD CONSTRAINT "app_funding_call_lifecycle_command_check"
    CHECK ("command" IN (
      'SUBMIT_FOR_APPROVAL',
      'RETURN_FOR_AMENDMENT',
      'WITHDRAW_APPROVAL_REQUEST',
      'APPROVE',
      'PUBLISH',
      'OPEN',
      'SUSPEND',
      'RESUME',
      'CLOSE',
      'WITHDRAW',
      'ARCHIVE'
    ));
--> statement-breakpoint
CREATE TABLE "app_funding_call_governance_policy" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "allow_submitter_withdrawal" boolean DEFAULT true NOT NULL,
  "enforce_maker_checker" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "app_funding_call_governance_policy_singleton_check"
    CHECK ("id" = 1)
);
--> statement-breakpoint
ALTER TABLE "app_funding_call_governance_policy"
  ADD CONSTRAINT "app_funding_call_governance_policy_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "app_funding_call_governance_policy"
  ("id", "allow_submitter_withdrawal", "enforce_maker_checker")
VALUES (1, true, true);
--> statement-breakpoint
CREATE TABLE "app_funding_call_governance_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "funding_call_id" uuid NOT NULL,
  "outcome" text DEFAULT 'PENDING' NOT NULL,
  "submitted_by" uuid NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL,
  "submitted_row_version" integer NOT NULL,
  "creator_id" uuid NOT NULL,
  "material_editor_id" uuid NOT NULL,
  "configuration_snapshot" jsonb NOT NULL,
  "decided_by" uuid,
  "decided_at" timestamp with time zone,
  "decision_row_version" integer,
  "reason" text,
  CONSTRAINT "app_funding_call_governance_review_outcome_check"
    CHECK ("outcome" IN ('PENDING', 'APPROVED', 'RETURNED', 'WITHDRAWN')),
  CONSTRAINT "app_funding_call_governance_review_submission_version_check"
    CHECK ("submitted_row_version" > 0),
  CONSTRAINT "app_funding_call_governance_review_decision_check"
    CHECK (
      ("outcome" = 'PENDING'
        AND "decided_by" IS NULL
        AND "decided_at" IS NULL
        AND "decision_row_version" IS NULL
        AND "reason" IS NULL)
      OR ("outcome" <> 'PENDING'
        AND "decided_by" IS NOT NULL
        AND "decided_at" IS NOT NULL
        AND "decision_row_version" > "submitted_row_version")
    ),
  CONSTRAINT "app_funding_call_governance_review_reason_check"
    CHECK (
      ("outcome" = 'RETURNED' AND length(trim("reason")) > 0)
      OR ("outcome" <> 'RETURNED' AND "reason" IS NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "app_funding_call_governance_reviews"
  ADD CONSTRAINT "app_funding_call_governance_review_call_fk"
  FOREIGN KEY ("funding_call_id") REFERENCES "public"."app_funding_calls"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_governance_review_submitter_fk"
  FOREIGN KEY ("submitted_by") REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_governance_review_creator_fk"
  FOREIGN KEY ("creator_id") REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_governance_review_editor_fk"
  FOREIGN KEY ("material_editor_id") REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_governance_review_decider_fk"
  FOREIGN KEY ("decided_by") REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_call_governance_review_call_time_idx"
  ON "app_funding_call_governance_reviews"
  ("funding_call_id", "submitted_at", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_governance_review_pending_unique"
  ON "app_funding_call_governance_reviews" ("funding_call_id")
  WHERE "outcome" = 'PENDING';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_funding_call_governed_configuration()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
    NEW.reference IS DISTINCT FROM OLD.reference
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.eligibility_summary IS DISTINCT FROM OLD.eligibility_summary
    OR NEW.eligibility_rule_set_version_id IS DISTINCT FROM OLD.eligibility_rule_set_version_id
    OR NEW.form_version_id IS DISTINCT FROM OLD.form_version_id
    OR NEW.workflow_template_version_id IS DISTINCT FROM OLD.workflow_template_version_id
    OR NEW.funding_instrument IS DISTINCT FROM OLD.funding_instrument
    OR NEW.thematic_area IS DISTINCT FROM OLD.thematic_area
    OR NEW.total_budget_envelope IS DISTINCT FROM OLD.total_budget_envelope
    OR NEW.minimum_grant_amount IS DISTINCT FROM OLD.minimum_grant_amount
    OR NEW.maximum_grant_amount IS DISTINCT FROM OLD.maximum_grant_amount
    OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
    OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
    OR NEW.public_contact_name IS DISTINCT FROM OLD.public_contact_name
    OR NEW.public_contact_email IS DISTINCT FROM OLD.public_contact_email
    OR NEW.public_contact_phone IS DISTINCT FROM OLD.public_contact_phone
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'only draft funding call configuration can be edited';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_calls_governed_configuration
BEFORE UPDATE ON "app_funding_calls"
FOR EACH ROW EXECUTE FUNCTION protect_funding_call_governed_configuration();
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('funding.call.submit.all', 'Submit any draft funding call for governance approval'),
  ('funding.call.approve.all', 'Approve any pending funding call subject to maker-checker policy'),
  ('funding.call.return.all', 'Return any pending funding call to draft with a reason'),
  ('funding.call.approval-request.own.withdraw', 'Withdraw an own funding call approval request when policy permits')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row.id, capability_row.id
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE (
  role_row.code = 'system_administrator'
  OR (role_row.code = 'programme_officer' AND capability_row.code IN (
    'funding.call.submit.all',
    'funding.call.return.all',
    'funding.call.approval-request.own.withdraw'
  ))
  OR (role_row.code = 'approval_panel_member' AND capability_row.code IN (
    'funding.call.approve.all',
    'funding.call.return.all'
  ))
)
AND capability_row.code IN (
  'funding.call.submit.all',
  'funding.call.approve.all',
  'funding.call.return.all',
  'funding.call.approval-request.own.withdraw'
)
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
