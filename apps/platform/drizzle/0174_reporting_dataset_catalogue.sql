-- Install developer-owned immutable dataset definitions from actual PostgreSQL projections.
-- Reruns never overwrite a version. New columns or semantics require a new version/view.
INSERT INTO app_reporting_datasets(key, version, name, definition)
SELECT 'website-analytics', 1, 'Website Analytics', '{"sourcePermissions": ["reporting.website.read.all"], "functions": ["count", "sum", "avg", "min", "max", "round", "abs", "lower", "upper", "length", "date_trunc", "extract", "timezone"], "scope": "all", "notes": ["Property, timezone, collection start, period and call scope are server-owned; only d1-v2 scopes with panels are exposed.", "Metric families are combined with UNION ALL. Missing data remains NULL; source state, thresholding, sampling and coverage identity remain explicit.", "Website traffic and Namibia geography have different labelled scopes; distinct users are not additive."], "joins": []}'::jsonb || jsonb_build_object(
  'relations', (
    SELECT jsonb_agg(jsonb_build_object('name', approved.name, 'grain', approved.grain,
      'columns', (
        SELECT jsonb_agg(jsonb_build_object('name', attribute.attname,
          'type', CASE type.typname WHEN 'int4' THEN 'integer' WHEN 'int8' THEN 'integer'
            WHEN 'bool' THEN 'boolean' ELSE type.typname END,
          'nullable', true) ORDER BY attribute.attnum)
        FROM pg_attribute attribute JOIN pg_type type ON type.oid = attribute.atttypid
        WHERE attribute.attrelid = to_regclass(approved.name)
          AND attribute.attnum > 0 AND NOT attribute.attisdropped
      )) ORDER BY approved.name)
    FROM (VALUES
    ('app_reporting_dataset_website_metrics_v1', 'one exact query/source/dimension/metric'),
    ('app_reporting_dataset_website_eligibility_v1', 'one call/ruleset/outcome in the server period')
    ) approved(name, grain)
  )
)
ON CONFLICT (key, version) DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON app_reporting_dataset_website_metrics_v1, app_reporting_dataset_website_eligibility_v1 TO app_reporting_reader;
--> statement-breakpoint
INSERT INTO app_reporting_datasets(key, version, name, definition)
SELECT 'application-data', 1, 'Application Data', '{"sourcePermissions": ["funding.application.all.read"], "functions": ["count", "sum", "avg", "min", "max", "round", "abs", "lower", "upper", "length", "date_trunc", "extract", "timezone"], "scope": "all", "notes": ["Applicant exports use submitted business and stable scalar form answers; drafts, documents, credentials and raw answer blobs are excluded.", "Repeatable answers are not expanded into application rows. Additional approved fields require a new dataset version.", "Monetary columns are numeric(18,2); invalid source amounts fail instead of being reported as zero."], "joins": []}'::jsonb || jsonb_build_object(
  'relations', (
    SELECT jsonb_agg(jsonb_build_object('name', approved.name, 'grain', approved.grain,
      'columns', (
        SELECT jsonb_agg(jsonb_build_object('name', attribute.attname,
          'type', CASE type.typname WHEN 'int4' THEN 'integer' WHEN 'int8' THEN 'integer'
            WHEN 'bool' THEN 'boolean' ELSE type.typname END,
          'nullable', true) ORDER BY attribute.attnum)
        FROM pg_attribute attribute JOIN pg_type type ON type.oid = attribute.atttypid
        WHERE attribute.attrelid = to_regclass(approved.name)
          AND attribute.attnum > 0 AND NOT attribute.attisdropped
      )) ORDER BY approved.name)
    FROM (VALUES
    ('app_reporting_dataset_applications_v1', 'one lodged application with its immutable submitted snapshot')
    ) approved(name, grain)
  )
)
ON CONFLICT (key, version) DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON app_reporting_dataset_applications_v1 TO app_reporting_reader;
--> statement-breakpoint
INSERT INTO app_reporting_datasets(key, version, name, definition)
SELECT 'workflow-operations', 1, 'Workflow Operations', '{"sourcePermissions": ["funding.application.all.read", "workflow.instance.all.read"], "functions": ["count", "sum", "avg", "min", "max", "round", "abs", "lower", "upper", "length", "date_trunc", "extract", "timezone"], "scope": "all", "notes": ["Pipeline counts distinct application_id per active stage and discloses parallel-stage overlap. Task totals must exclude cancelled/superseded tasks where appropriate.", "Completion identity is the recorded completion command actor, not the current assignee. Staff projection exposes only id and display name.", "Pauses merge overlapping scoped holds, RFIs and deferrals, bounded by server runAt and completion. Elapsed time is not hands-on effort.", "Commitments use the latest award decision only for terminal APPROVED workflows and submitted applications. Withdrawals and later rejection are excluded; missing required amounts produce NULL commitment totals with coverage diagnostics."], "joins": [{"from": "app_reporting_dataset_workflow_tasks_v1.stage_instance_id", "to": "app_reporting_dataset_workflow_stages_v1.stage_instance_id", "cardinality": "N:1"}]}'::jsonb || jsonb_build_object(
  'relations', (
    SELECT jsonb_agg(jsonb_build_object('name', approved.name, 'grain', approved.grain,
      'columns', (
        SELECT jsonb_agg(jsonb_build_object('name', attribute.attname,
          'type', CASE type.typname WHEN 'int4' THEN 'integer' WHEN 'int8' THEN 'integer'
            WHEN 'bool' THEN 'boolean' ELSE type.typname END,
          'nullable', true) ORDER BY attribute.attnum)
        FROM pg_attribute attribute JOIN pg_type type ON type.oid = attribute.atttypid
        WHERE attribute.attrelid = to_regclass(approved.name)
          AND attribute.attnum > 0 AND NOT attribute.attisdropped
      )) ORDER BY approved.name)
    FROM (VALUES
    ('app_reporting_dataset_workflow_stages_v1', 'one exact-version stage iteration'),
    ('app_reporting_dataset_workflow_tasks_v1', 'one task, including unassigned and cancelled history'),
    ('app_reporting_dataset_workflow_approvals_v1', 'one award decision with exact task/form response evidence'),
    ('app_reporting_dataset_effective_awards_v1', 'one latest effective terminal-approved award per submitted application'),
    ('app_reporting_dataset_call_commitments_v1', 'one call with envelope, effective commitments and missing-amount diagnostics')
    ) approved(name, grain)
  )
)
ON CONFLICT (key, version) DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON app_reporting_dataset_workflow_stages_v1, app_reporting_dataset_workflow_tasks_v1, app_reporting_dataset_workflow_approvals_v1, app_reporting_dataset_effective_awards_v1, app_reporting_dataset_call_commitments_v1 TO app_reporting_reader;
