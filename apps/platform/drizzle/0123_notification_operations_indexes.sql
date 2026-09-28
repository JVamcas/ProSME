CREATE INDEX IF NOT EXISTS "app_notification_deliveries_status_history_idx"
  ON "app_notification_deliveries" ("status", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "app_notification_deliveries_recipient_email_idx"
  ON "app_notification_deliveries" (lower("recipient_email"));
