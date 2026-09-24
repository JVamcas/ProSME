ALTER TABLE app_workflow_stage_definitions
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN optional boolean NOT NULL DEFAULT false,
  ADD COLUMN repeatable boolean NOT NULL DEFAULT false,
  ADD COLUMN coi_gated boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  ADD CONSTRAINT app_workflow_stages_stable_key_check
    CHECK (code ~ '^[A-Z][A-Z0-9_]*$'),
  ADD CONSTRAINT app_workflow_stages_name_check
    CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  ADD CONSTRAINT app_workflow_stages_description_check
    CHECK (length(description) <= 1000),
  ADD CONSTRAINT app_workflow_stages_public_status_check
    CHECK (applicant_status IN (
      'SUBMITTED',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'OUTCOME_AVAILABLE',
      'CLOSED',
      'WITHDRAWN'
    ));
