-- CMS owns event identity; registrations never copy editorial fields.
CREATE TABLE IF NOT EXISTS app_event_registration_settings (
  event_id integer PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  confirmation_enabled boolean NOT NULL DEFAULT true,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_hours integer NOT NULL DEFAULT 24 CHECK (reminder_hours BETWEEN 1 AND 168),
  updated_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (opens_at IS NULL OR closes_at IS NULL OR opens_at < closes_at)
);
CREATE TABLE IF NOT EXISTS app_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer NOT NULL,
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 320),
  organisation text CHECK (length(organisation) <= 200),
  email_consent boolean NOT NULL CHECK (email_consent),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);
CREATE INDEX IF NOT EXISTS app_event_registrations_page_idx
  ON app_event_registrations(event_id, registered_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS app_event_registration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer NOT NULL,
  registration_id uuid REFERENCES app_event_registrations(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL CHECK (action IN ('REGISTERED', 'SETTINGS_UPDATED', 'PARTICIPANTS_READ')),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_event_registration_audit_event_idx
  ON app_event_registration_audit(event_id, created_at DESC);
-- Intent is inert until phase 4 reconciliation and notification-engine handoff.
CREATE TABLE IF NOT EXISTS app_event_notification_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES app_event_registrations(id) ON DELETE RESTRICT,
  event_id integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('CONFIRMATION', 'REMINDER')),
  due_at timestamptz NOT NULL,
  published_snapshot jsonb NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'CAPTURED', 'CANCELLED')),
  outbox_id uuid REFERENCES app_notification_outbox(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, kind)
);
CREATE INDEX IF NOT EXISTS app_event_notification_intents_due_idx
  ON app_event_notification_intents(state, due_at, id);
INSERT INTO app_capabilities(code, description) VALUES
  ('events.registrations.read.all', 'Read participant records for any event.'),
  ('events.registration-settings.read.all', 'Read registration windows and email configuration for any event.'),
  ('events.registration-settings.update.all', 'Update registration windows and email configuration for any event.'),
  ('events.email-delivery.read.all', 'Read confirmation and reminder delivery status for any event.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Drizzle precedes Payload on fresh installs; both migrations can install these
-- foreign keys once their owning tables exist.
DO $$
DECLARE target_table text;
BEGIN
  IF to_regclass('cms_events') IS NOT NULL THEN
    FOREACH target_table IN ARRAY ARRAY[
      'app_event_registration_settings', 'app_event_registrations',
      'app_event_registration_audit', 'app_event_notification_intents'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = target_table || '_event_fk'
          AND conrelid = to_regclass(target_table)
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (event_id) REFERENCES cms_events(id) ON DELETE RESTRICT',
          target_table, target_table || '_event_fk'
        );
      END IF;
    END LOOP;
  END IF;
END $$;
