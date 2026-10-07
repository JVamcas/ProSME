ALTER TABLE app_reporting_website_source_snapshots
  DROP CONSTRAINT IF EXISTS app_reporting_website_source_name_check;
--> statement-breakpoint
ALTER TABLE app_reporting_website_source_snapshots
  ADD CONSTRAINT app_reporting_website_source_name_check CHECK (source_name IN (
    'traffic', 'applicationReach', 'starterCompletion', 'applicationFunnel',
    'dailyTraffic', 'mostViewedPages', 'geography', 'fundingCallEngagement',
    'selfCheckJourney', 'topUserJourneys'
  ));
