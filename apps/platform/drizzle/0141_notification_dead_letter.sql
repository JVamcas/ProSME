ALTER TABLE app_notification_outbox
  DROP CONSTRAINT app_notification_outbox_status_check,
  ADD CONSTRAINT app_notification_outbox_status_check
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'PARTIALLY_SENT', 'SENT', 'FAILED',
      'DEAD_LETTER'
    ));
--> statement-breakpoint
ALTER TABLE app_notification_deliveries
  DROP CONSTRAINT app_notification_deliveries_status_check,
  ADD CONSTRAINT app_notification_deliveries_status_check
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER'
    ));
--> statement-breakpoint
UPDATE app_notification_deliveries
SET status = 'DEAD_LETTER', updated_at = now()
WHERE status = 'FAILED'
  AND last_error_code = 'NOTIFICATION_RETRY_EXHAUSTED';
--> statement-breakpoint
UPDATE app_notification_outbox occurrence
SET status = 'DEAD_LETTER', updated_at = now()
WHERE occurrence.status = 'FAILED'
  AND EXISTS (
    SELECT 1
    FROM app_notification_deliveries delivery
    WHERE delivery.outbox_id = occurrence.id
      AND delivery.status = 'DEAD_LETTER'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM app_notification_deliveries delivery
    WHERE delivery.outbox_id = occurrence.id
      AND delivery.status <> 'DEAD_LETTER'
  );
