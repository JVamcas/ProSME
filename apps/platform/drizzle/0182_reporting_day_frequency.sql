-- Convert period rules to an anchor plus a configurable calendar-day frequency.
ALTER TABLE app_reporting_report_schedules
  ADD COLUMN IF NOT EXISTS frequency_days integer;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_reporting_report_schedules'
      AND column_name = 'cadence'
  ) THEN
    WITH frequencies AS (
      SELECT id, anchor, cursor,
        CASE cadence WHEN 'FOURTEEN_DAYS' THEN 14 ELSE 30 END AS days
      FROM app_reporting_report_schedules WHERE frequency_days IS NULL
    ), converted AS (
      SELECT id, days, anchor + ((cursor - anchor) / days) * days AS cursor
      FROM frequencies
    )
    UPDATE app_reporting_report_schedules schedule
    SET frequency_days = converted.days,
      cursor = converted.cursor,
      next_due_at = ((converted.cursor + converted.days)::text
        || ' ' || schedule.send_time)::timestamp AT TIME ZONE schedule.timezone,
      row_version = schedule.row_version + 1,
      lease_token = NULL,
      lease_until = NULL,
      error = NULL
    FROM converted WHERE schedule.id = converted.id;
  END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE app_reporting_report_schedules
  ALTER COLUMN frequency_days SET NOT NULL;
ALTER TABLE app_reporting_report_schedules
  DROP CONSTRAINT IF EXISTS app_reporting_report_schedules_frequency_days_check;
ALTER TABLE app_reporting_report_schedules
  ADD CONSTRAINT app_reporting_report_schedules_frequency_days_check
  CHECK (frequency_days BETWEEN 1 AND 366);
--> statement-breakpoint
-- Existing run periods and pending run references remain immutable history.
ALTER TABLE app_reporting_report_schedules DROP COLUMN IF EXISTS cadence;
ALTER TABLE app_reporting_report_schedules DROP COLUMN IF EXISTS finalization_hours;
