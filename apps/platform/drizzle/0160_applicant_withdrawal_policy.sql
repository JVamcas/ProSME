-- Preserve published definitions and their audit history. Adding a defaulted
-- column retains the existing unrestricted applicant withdrawal behaviour.
ALTER TABLE app_workflow_stage_definitions
  ADD COLUMN allow_applicant_withdrawal boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE app_funding_calls
  ADD COLUMN allow_resubmission_after_withdrawal boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- This is the application's frozen copy of the published funding-call policy,
-- used by unique indexes. It is never an independently editable setting.
ALTER TABLE app_applications
  ADD COLUMN allow_resubmission_after_withdrawal boolean NOT NULL DEFAULT false;
--> statement-breakpoint
DROP INDEX app_applications_business_opportunity_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_applications_business_opportunity_unique
  ON app_applications (business_id, funding_opportunity_id)
  WHERE deleted_at IS NULL
    AND duplicate_policy = 'one_per_business'
    AND business_id IS NOT NULL
    AND (status <> 'withdrawn' OR NOT allow_resubmission_after_withdrawal);
--> statement-breakpoint
CREATE FUNCTION protect_application_resubmission_policy()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.allow_resubmission_after_withdrawal
      IS DISTINCT FROM OLD.allow_resubmission_after_withdrawal THEN
    RAISE EXCEPTION 'application resubmission policy is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER app_application_resubmission_policy_immutable
BEFORE UPDATE OF allow_resubmission_after_withdrawal ON app_applications
FOR EACH ROW EXECUTE FUNCTION protect_application_resubmission_policy();
--> statement-breakpoint
DROP INDEX app_applications_applicant_opportunity_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_applications_applicant_opportunity_unique
  ON app_applications (owner_user_id, funding_opportunity_id)
  WHERE deleted_at IS NULL
    AND duplicate_policy = 'one_per_applicant'
    AND (status <> 'withdrawn' OR NOT allow_resubmission_after_withdrawal);
