-- Withdrawn history must not occupy an active-application uniqueness slot.
-- Creation checks the latest published call's resubmission policy; submission
-- checks the replacement application's frozen policy. Historical applications
-- retain their immutable policy values and audit records.
DROP INDEX app_applications_business_opportunity_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_applications_business_opportunity_unique
  ON app_applications (business_id, funding_opportunity_id)
  WHERE deleted_at IS NULL
    AND duplicate_policy = 'one_per_business'
    AND business_id IS NOT NULL
    AND status <> 'withdrawn';
--> statement-breakpoint
DROP INDEX app_applications_applicant_opportunity_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_applications_applicant_opportunity_unique
  ON app_applications (owner_user_id, funding_opportunity_id)
  WHERE deleted_at IS NULL
    AND duplicate_policy = 'one_per_applicant'
    AND status <> 'withdrawn';
