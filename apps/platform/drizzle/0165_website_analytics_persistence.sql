CREATE TABLE IF NOT EXISTS app_reporting_website_queries (
  query_key text PRIMARY KEY,
  property_id text NOT NULL,
  timezone text NOT NULL,
  collection_start date NOT NULL,
  contract_version text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  funding_call_id uuid,
  include_panels boolean NOT NULL DEFAULT false,
  last_requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_due_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  failures jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT app_reporting_website_period_check CHECK (start_date <= end_date)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_reporting_website_due_idx
  ON app_reporting_website_queries (next_due_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_website_source_snapshots (
  query_key text NOT NULL REFERENCES app_reporting_website_queries(query_key) ON DELETE CASCADE,
  source_name text NOT NULL,
  state text NOT NULL,
  data jsonb NOT NULL,
  metadata jsonb,
  note text,
  fetched_at timestamptz NOT NULL,
  PRIMARY KEY (query_key, source_name),
  CONSTRAINT app_reporting_website_source_state_check
    CHECK (state IN ('ready', 'no-data', 'unavailable')),
  CONSTRAINT app_reporting_website_source_name_check CHECK (source_name IN (
    'traffic', 'applicationReach', 'starterCompletion', 'applicationFunnel',
    'dailyTraffic', 'mostViewedPages', 'geography', 'fundingCallEngagement', 'selfCheckJourney'
  ))
);
