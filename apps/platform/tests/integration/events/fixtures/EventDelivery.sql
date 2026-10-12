
      CREATE TABLE app_users(id uuid PRIMARY KEY);
      CREATE TABLE app_capabilities(code text PRIMARY KEY, description text);
      CREATE TABLE cms_events(id integer PRIMARY KEY, title text, slug text, starts_at timestamptz, ends_at timestamptz, timezone text, location text, _status text);
      CREATE TABLE app_notification_catalogs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_key text UNIQUE, display_name text, description text, sort_order integer, is_enabled boolean);
      CREATE TABLE app_notification_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_id uuid, event_key text UNIQUE, display_name text, description text, rule_eligibility text);
      CREATE TABLE app_notification_channels(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE);
      CREATE TABLE app_notification_template_targets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), channel_id uuid, scope text, event_id uuid, default_subject_template text, UNIQUE(channel_id,event_id));
      CREATE TABLE app_notification_outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid, event_key text, aggregate_type text, aggregate_id uuid, occurrence_key text, correlation_id text, context jsonb, status text DEFAULT 'PENDING', available_at timestamptz DEFAULT now(), locked_by text, locked_at timestamptz, updated_at timestamptz DEFAULT now(), UNIQUE(event_key,occurrence_key));
      CREATE TABLE app_notification_deliveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), outbox_id uuid, channel_id uuid, recipient_name text, recipient_email text, recipient_type text, resolution_path text, status text DEFAULT 'PENDING', attempt_count integer DEFAULT 0, last_error_code text, sent_at timestamptz, updated_at timestamptz DEFAULT now(), UNIQUE(outbox_id,channel_id,recipient_email), CONSTRAINT app_notification_deliveries_recipient_check CHECK(recipient_type IN ('ACCOUNT_HOLDER')));

      INSERT INTO app_notification_channels(code) VALUES ('EMAIL');
    