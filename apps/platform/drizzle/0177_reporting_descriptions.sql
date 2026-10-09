-- Descriptions follow the implementation plan and its Reporting Bootstrap Inventory.
ALTER TABLE app_reporting_datasets ADD COLUMN IF NOT EXISTS description text;
--> statement-breakpoint
ALTER TABLE app_reporting_templates ADD COLUMN IF NOT EXISTS description text;
--> statement-breakpoint
ALTER TABLE app_reporting_reports ADD COLUMN IF NOT EXISTS description text;
--> statement-breakpoint
-- Only this migration may backfill metadata on immutable dataset versions.
ALTER TABLE app_reporting_datasets DISABLE TRIGGER app_reporting_datasets_immutable;
--> statement-breakpoint
UPDATE app_reporting_datasets SET description = CASE key
  WHEN 'website-analytics' THEN 'Exact-period website traffic, pages, geography, call engagement, funnels, journeys and anonymous eligibility metrics, with source state and coverage information.'
  WHEN 'application-data' THEN 'One row per lodged application using its immutable submitted business, project, financial and approved scalar form values.'
  WHEN 'workflow-operations' THEN 'Versioned workflow stages, tasks and effective approvals for pipeline, ageing, turnaround, reviewer workload and budget reporting, including pause-adjusted elapsed time.'
  ELSE name || ' reporting dataset with approved source projections.'
END WHERE description IS NULL;
--> statement-breakpoint
ALTER TABLE app_reporting_datasets ENABLE TRIGGER app_reporting_datasets_immutable;
--> statement-breakpoint
UPDATE app_reporting_templates template SET description = CASE template.key
  WHEN 'website-analytics' THEN 'Website-wide exact-period metrics as ordered tabular rows, including section, dimension, metric, value, unit, source state and coverage.'
  WHEN 'application-export' THEN 'One lodged application per row, including its reference, funding call, submission date, lifecycle status and submitted business, project and financial values.'
  WHEN 'application-pipeline' THEN 'Distinct active application counts by funding call and stage, including disclosure of overlap across parallel stages.'
  WHEN 'application-ageing' THEN 'One active stage iteration per row, with application reference, funding call, stage, activation time, gross age, paused hours and active elapsed hours.'
  WHEN 'workflow-turnaround' THEN 'Completed stage and completing-user summaries with completion counts and average, minimum, maximum and pause-adjusted elapsed time.'
  WHEN 'reviewer-workload' THEN 'Task totals by reviewer and funding call, including pending, in-progress, overdue, completed-in-period and unassigned work.'
  WHEN 'budget-commitments' THEN 'Funding-call envelopes, effective committed amounts, remaining amounts, utilisation and amount-coverage diagnostics using the latest terminal-approved awards.'
  ELSE template.name || ' SQL template for the ' || dataset.name || ' dataset.'
END FROM app_reporting_datasets dataset
WHERE dataset.key = template.definition->>'datasetKey'
  AND dataset.version = (template.definition->>'datasetVersion')::integer
  AND template.description IS NULL;
--> statement-breakpoint
UPDATE app_reporting_reports report SET description = CASE report.key
  WHEN 'website-biweekly' THEN 'Website-wide analytics from collection start through yesterday, including source state and coverage, configured for bi-weekly reporting.'
  WHEN 'website-monthly' THEN 'Website-wide analytics from collection start through yesterday, including source state and coverage, configured for monthly reporting.'
  WHEN 'application-data-export' THEN 'Submitted and withdrawn lodged applications from the previous complete month across permitted funding calls and compatible form versions.'
  WHEN 'application-pipeline' THEN 'Current snapshot of distinct active applications by permitted funding call and workflow stage, including parallel-stage overlap.'
  WHEN 'application-ageing' THEN 'Current snapshot of active stage iterations across permitted calls and stages, showing gross and pause-adjusted age with a default minimum age of zero hours.'
  WHEN 'workflow-turnaround' THEN 'Stage and completing-user turnaround for work completed in the previous complete month across permitted calls, stages and users.'
  WHEN 'reviewer-workload' THEN 'Current open tasks and completions in the previous complete month across permitted calls and reviewers, with unassigned work shown separately.'
  WHEN 'budget-commitments' THEN 'Current funding-call budget commitments from the latest terminal-approved awards, excluding withdrawals, with remaining envelope and amount-coverage diagnostics.'
  ELSE report.name || ': uses the ' || template.name || ' template (version ' || report.template_version || ').'
END FROM app_reporting_templates template
WHERE template.id = report.template_id AND report.description IS NULL;
--> statement-breakpoint
ALTER TABLE app_reporting_datasets ALTER COLUMN description SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app_reporting_datasets DROP CONSTRAINT IF EXISTS app_reporting_datasets_description_check;
--> statement-breakpoint
ALTER TABLE app_reporting_datasets ADD CONSTRAINT app_reporting_datasets_description_check
  CHECK (length(description) <= 2000 AND description ~ '[^[:space:]]');
--> statement-breakpoint
ALTER TABLE app_reporting_templates ALTER COLUMN description SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app_reporting_templates DROP CONSTRAINT IF EXISTS app_reporting_templates_description_check;
--> statement-breakpoint
ALTER TABLE app_reporting_templates ADD CONSTRAINT app_reporting_templates_description_check
  CHECK (length(description) <= 2000 AND description ~ '[^[:space:]]');
--> statement-breakpoint
ALTER TABLE app_reporting_reports ALTER COLUMN description SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app_reporting_reports DROP CONSTRAINT IF EXISTS app_reporting_reports_description_check;
--> statement-breakpoint
ALTER TABLE app_reporting_reports ADD CONSTRAINT app_reporting_reports_description_check
  CHECK (length(description) <= 2000 AND description ~ '[^[:space:]]');
--> statement-breakpoint
