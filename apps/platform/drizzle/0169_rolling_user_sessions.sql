CREATE TABLE IF NOT EXISTS app_user_sessions (
  session_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  firebase_subject text NOT NULL,
  expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  CONSTRAINT app_user_sessions_expiry_check CHECK (expires_at <= absolute_expires_at)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_user_sessions_expiry_idx ON app_user_sessions(expires_at);
