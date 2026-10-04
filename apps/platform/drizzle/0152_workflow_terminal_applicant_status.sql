-- Route-specific applicant wording; null retains existing published behavior.
ALTER TABLE app_workflow_transition_definitions
  ADD COLUMN IF NOT EXISTS terminal_applicant_status jsonb;
