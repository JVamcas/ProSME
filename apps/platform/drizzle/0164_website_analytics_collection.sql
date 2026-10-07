CREATE TABLE app_reporting_anonymous_eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_call_id uuid NOT NULL REFERENCES app_funding_calls(id),
  funding_call_version integer NOT NULL,
  rule_set_version_id uuid NOT NULL REFERENCES app_eligibility_rule_set_versions(id),
  outcome text NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT app_reporting_eligibility_outcome_check CHECK (
    outcome IN ('likely-eligible', 'not-currently-eligible', 'review-required')
  ),
  CONSTRAINT app_reporting_eligibility_version_check CHECK (funding_call_version > 0)
);
--> statement-breakpoint
CREATE INDEX app_reporting_eligibility_period_idx
  ON app_reporting_anonymous_eligibility_checks (occurred_at);
--> statement-breakpoint
CREATE INDEX app_reporting_eligibility_call_period_idx
  ON app_reporting_anonymous_eligibility_checks (funding_call_id, occurred_at);
--> statement-breakpoint
INSERT INTO app_capabilities (code, description) VALUES (
  'reporting.website.read.all',
  'Read consent-based website metrics and anonymous advisory eligibility aggregates across all funding calls.'
) ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Bootstrap administrators receive the new, explicit permission.
-- Other roles require an explicit PostgreSQL grant; CMS/application access is insufficient.
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role.id, permission.id
FROM app_roles role CROSS JOIN app_capabilities permission
WHERE role.code = 'system_administrator'
  AND permission.code = 'reporting.website.read.all'
ON CONFLICT (role_id, capability_id) DO NOTHING;
