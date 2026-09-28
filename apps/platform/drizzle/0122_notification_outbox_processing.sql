CREATE INDEX IF NOT EXISTS "app_notification_outbox_stale_lock_idx"
  ON "app_notification_outbox" ("status", "locked_at", "id");
