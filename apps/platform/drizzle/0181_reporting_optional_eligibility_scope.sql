-- Empty optional funding-call settings must remain NULL even if PostgreSQL
-- evaluates both sides of the scope predicate while planning an empty result.
CREATE OR REPLACE VIEW app_reporting_dataset_website_eligibility_v1
WITH (security_barrier = true) AS
SELECT check_record.funding_call_id, call.title AS funding_call_title,
  check_record.funding_call_version, check_record.rule_set_version_id,
  check_record.outcome, count(*)::integer AS checks
FROM app_reporting_anonymous_eligibility_checks check_record
JOIN app_funding_calls call ON call.id = check_record.funding_call_id
WHERE app_reporting_dataset_authorized('website-analytics')
  AND check_record.occurred_at >=
    (nullif(current_setting('app.reporting_start_date', true), '')::date::timestamp
      AT TIME ZONE current_setting('app.reporting_timezone', true))
  AND check_record.occurred_at <
    ((nullif(current_setting('app.reporting_end_date', true), '')::date + 1)::timestamp
      AT TIME ZONE current_setting('app.reporting_timezone', true))
  AND (nullif(current_setting('app.reporting_funding_call', true), '') IS NULL
    OR check_record.funding_call_id = nullif(current_setting('app.reporting_funding_call', true), '')::uuid)
GROUP BY check_record.funding_call_id, call.title, check_record.funding_call_version,
  check_record.rule_set_version_id, check_record.outcome;
