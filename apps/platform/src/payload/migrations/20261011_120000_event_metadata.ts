import {
  sql,
  type MigrateDownArgs,
  type MigrateUpArgs,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE cms_events
      ADD COLUMN IF NOT EXISTS timezone varchar DEFAULT 'Africa/Windhoek',
      ADD COLUMN IF NOT EXISTS event_type varchar DEFAULT 'information-session',
      ADD COLUMN IF NOT EXISTS category varchar DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS recording_url varchar;
    ALTER TABLE _cms_events_v
      ADD COLUMN IF NOT EXISTS version_timezone varchar DEFAULT 'Africa/Windhoek',
      ADD COLUMN IF NOT EXISTS version_event_type varchar DEFAULT 'information-session',
      ADD COLUMN IF NOT EXISTS version_category varchar DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS version_recording_url varchar;
    DO $$
    DECLARE target_table text;
    BEGIN
      FOREACH target_table IN ARRAY ARRAY[
        'app_event_registration_settings', 'app_event_registrations',
        'app_event_registration_audit', 'app_event_notification_intents'
      ] LOOP
        IF to_regclass(target_table) IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = target_table || '_event_fk'
            AND conrelid = to_regclass(target_table)
        ) THEN
          EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (event_id) REFERENCES cms_events(id) ON DELETE RESTRICT',
            target_table, target_table || '_event_fk'
          );
        END IF;
      END LOOP;
    END $$;
    DO $$ BEGIN
      IF to_regprocedure('app_reconcile_published_event_emails()') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS app_event_email_publication_reconcile ON cms_events;
        CREATE TRIGGER app_event_email_publication_reconcile
          AFTER UPDATE OF _status, starts_at, ends_at, timezone, title, slug, location
          ON cms_events FOR EACH ROW EXECUTE FUNCTION app_reconcile_published_event_emails();
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS cms_events_public_date_idx
      ON cms_events(_status, event_type, starts_at, id);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS cms_events_public_date_idx;
    ALTER TABLE cms_events
      DROP COLUMN IF EXISTS timezone,
      DROP COLUMN IF EXISTS event_type,
      DROP COLUMN IF EXISTS category,
      DROP COLUMN IF EXISTS recording_url;
    ALTER TABLE _cms_events_v
      DROP COLUMN IF EXISTS version_timezone,
      DROP COLUMN IF EXISTS version_event_type,
      DROP COLUMN IF EXISTS version_category,
      DROP COLUMN IF EXISTS version_recording_url;
  `);
}
