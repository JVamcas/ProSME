CREATE OR REPLACE VIEW app_reporting_dataset_website_metrics_v1
WITH (security_barrier = true) AS
WITH sources AS (
  SELECT q.query_key, q.property_id, q.timezone, q.start_date, q.end_date,
    q.collection_start, q.contract_version, q.funding_call_id,
    expected.source_name, s.data, s.fetched_at, s.note AS source_note,
    CASE WHEN q.failures ? expected.source_name THEN 'failure'
      ELSE coalesce(s.state, 'unavailable') END AS source_state,
    coalesce((s.metadata->>'subjectToThresholding')::boolean, false) AS subject_to_thresholding,
    coalesce((s.metadata->>'sampled')::boolean, false) AS sampled,
    coalesce((s.metadata->>'dataLossFromOtherRow')::boolean, false) AS data_loss_from_other_row,
    coalesce((s.data->>'truncated')::boolean, false) AS truncated
  FROM app_reporting_website_queries q
  CROSS JOIN (VALUES ('traffic'), ('applicationReach'), ('starterCompletion'),
    ('applicationFunnel'), ('dailyTraffic'), ('mostViewedPages'), ('geography'),
    ('fundingCallEngagement'), ('selfCheckJourney'), ('topUserJourneys')) expected(source_name)
  LEFT JOIN app_reporting_website_source_snapshots s
    ON s.query_key = q.query_key AND s.source_name = expected.source_name
  WHERE app_reporting_dataset_authorized('website-analytics')
    AND q.contract_version = 'd1-v2' AND q.include_panels
    AND q.property_id = current_setting('app.reporting_property', true)
    AND q.timezone = current_setting('app.reporting_timezone', true)
    AND q.collection_start = nullif(current_setting('app.reporting_collection_start', true), '')::date
    AND q.start_date = nullif(current_setting('app.reporting_start_date', true), '')::date
    AND q.end_date = nullif(current_setting('app.reporting_end_date', true), '')::date
    AND q.funding_call_id IS NOT DISTINCT FROM nullif(current_setting('app.reporting_funding_call', true), '')::uuid
)
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'visitors'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'visitors') = 'number'
    THEN (s.data->>'visitors')::numeric END AS numeric_value,
  'count'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'traffic'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'pageViews'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'pageViews') = 'number'
    THEN (s.data->>'pageViews')::numeric END AS numeric_value,
  'count'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'traffic'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'averageSessionDurationSeconds'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'averageSessionDurationSeconds') = 'number'
    THEN (s.data->>'averageSessionDurationSeconds')::numeric END AS numeric_value,
  'seconds'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'traffic'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'startedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'startedUsers') = 'number'
    THEN (s.data->>'startedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationReach'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'submittedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'submittedUsers') = 'number'
    THEN (s.data->>'submittedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationReach'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'startedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'startedUsers') = 'number'
    THEN (s.data->>'startedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'starterCompletion'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'submittedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'submittedUsers') = 'number'
    THEN (s.data->>'submittedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'starterCompletion'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'rate'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'rate') = 'number'
    THEN (s.data->>'rate')::numeric END AS numeric_value,
  'ratio'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'starterCompletion'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'viewedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'viewedUsers') = 'number'
    THEN (s.data->>'viewedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationFunnel'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'completedSelfCheckUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'completedSelfCheckUsers') = 'number'
    THEN (s.data->>'completedSelfCheckUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationFunnel'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'startedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'startedUsers') = 'number'
    THEN (s.data->>'startedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationFunnel'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'submittedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'submittedUsers') = 'number'
    THEN (s.data->>'submittedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'applicationFunnel'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'viewedUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'viewedUsers') = 'number'
    THEN (s.data->>'viewedUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'selfCheckJourney'
UNION ALL
SELECT s.query_key, s.source_name AS section, 'summary'::text AS dimension,
  'completedSelfCheckUsers'::text AS metric,
  CASE WHEN jsonb_typeof(s.data->'completedSelfCheckUsers') = 'number'
    THEN (s.data->>'completedSelfCheckUsers')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s

WHERE s.source_name = 'selfCheckJourney'
UNION ALL
SELECT s.query_key, s.source_name AS section, item.value->>'date'::text AS dimension,
  'pageViews'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'pageViews') = 'number'
    THEN (item.value->>'pageViews')::numeric END AS numeric_value,
  'count'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.data) = 'array' THEN s.data ELSE '[]'::jsonb END) item(value) ON true
WHERE s.source_name = 'dailyTraffic'
UNION ALL
SELECT s.query_key, s.source_name AS section, item.value->>'date'::text AS dimension,
  'sessions'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'sessions') = 'number'
    THEN (item.value->>'sessions')::numeric END AS numeric_value,
  'count'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.data) = 'array' THEN s.data ELSE '[]'::jsonb END) item(value) ON true
WHERE s.source_name = 'dailyTraffic'
UNION ALL
SELECT s.query_key, s.source_name AS section, item.value->>'path'::text AS dimension,
  'pageViews'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'pageViews') = 'number'
    THEN (item.value->>'pageViews')::numeric END AS numeric_value,
  'count'::text AS unit, 'website-wide'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'rows','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'mostViewedPages'
UNION ALL
SELECT s.query_key, s.source_name AS section, coalesce(item.value->>'canonicalRegion', item.value->>'providerRegion')::text AS dimension,
  'users'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'users') = 'number'
    THEN (item.value->>'users')::numeric END AS numeric_value,
  'count'::text AS unit, 'Namibia'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'regions','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'geography'
UNION ALL
SELECT s.query_key, s.source_name AS section, coalesce(item.value->>'canonicalRegion', item.value->>'providerRegion')::text AS dimension,
  'share'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'share') = 'number'
    THEN (item.value->>'share')::numeric END AS numeric_value,
  'ratio'::text AS unit, 'Namibia'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'regions','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'geography'
UNION ALL
SELECT s.query_key, s.source_name AS section, concat(item.value->>'fundingCallId', ':', item.value->>'event')::text AS dimension,
  'users'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'users') = 'number'
    THEN (item.value->>'users')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'rows','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'fundingCallEngagement'
UNION ALL
SELECT s.query_key, s.source_name AS section, concat(item.value->>'fundingCallId', ':', item.value->>'event')::text AS dimension,
  'events'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'events') = 'number'
    THEN (item.value->>'events')::numeric END AS numeric_value,
  'count'::text AS unit, CASE WHEN s.funding_call_id IS NULL THEN 'website-wide' ELSE 'funding-call' END::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'rows','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'fundingCallEngagement'
UNION ALL
SELECT s.query_key, s.source_name AS section, (SELECT string_agg(step.value, ' -> ' ORDER BY step.ordinality) FROM jsonb_array_elements_text(item.value->'steps') WITH ORDINALITY step(value, ordinality))::text AS dimension,
  'users'::text AS metric,
  CASE WHEN jsonb_typeof(item.value->'users') = 'number'
    THEN (item.value->>'users')::numeric END AS numeric_value,
  'count'::text AS unit, 'public-website'::text AS metric_scope,
  s.source_state, s.fetched_at, s.source_note,
  s.property_id, s.timezone, s.start_date, s.end_date, s.collection_start,
  s.contract_version, s.funding_call_id,
  s.subject_to_thresholding, s.sampled, s.data_loss_from_other_row, s.truncated
FROM sources s
LEFT JOIN LATERAL jsonb_array_elements(coalesce(s.data->'rows','[]'::jsonb)) item(value) ON true
WHERE s.source_name = 'topUserJourneys';
--> statement-breakpoint
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
    OR check_record.funding_call_id = current_setting('app.reporting_funding_call', true)::uuid)
GROUP BY check_record.funding_call_id, call.title, check_record.funding_call_version,
  check_record.rule_set_version_id, check_record.outcome;
--> statement-breakpoint
CREATE OR REPLACE VIEW app_reporting_dataset_applications_v1
WITH (security_barrier = true) AS
SELECT application.id AS application_id, application.reference,
  application.funding_opportunity_id AS funding_call_id,
  call.title AS funding_call_title, application.status AS lifecycle_status,
  snapshot.submitted_at, snapshot.form_version_id,
  snapshot.workflow_template_version_id,
  snapshot.business_data->>'legalName' AS business_name,
  snapshot.business_data->>'region' AS business_region,
  snapshot.business_data->>'sector' AS business_sector,
  snapshot.normalized_form_values->>'PROJECT_TITLE' AS project_title,
  (snapshot.normalized_form_values->>'REQUESTED_GRANT_AMOUNT')::numeric(18,2) AS requested_grant_amount,
  (snapshot.normalized_form_values->>'TOTAL_PROJECT_COST')::numeric(18,2) AS total_project_cost,
  (snapshot.normalized_form_values->>'APPLICANT_COFUNDING_AMOUNT')::numeric(18,2) AS applicant_cofunding_amount
FROM app_applications application
JOIN app_application_submission_snapshots snapshot
  ON snapshot.id = application.submission_snapshot_id
  AND snapshot.application_id = application.id
  AND snapshot.form_version_id = application.form_version_id
JOIN app_funding_calls call ON call.id = application.funding_opportunity_id
JOIN app_form_versions version ON version.id = snapshot.form_version_id
WHERE app_reporting_dataset_authorized('application-data')
  AND application.deleted_at IS NULL AND application.submitted_at IS NOT NULL;
