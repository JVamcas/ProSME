CREATE TABLE IF NOT EXISTS app_chatbot_settings (
  key text PRIMARY KEY CHECK (key = 'SETTINGS'),
  public_enabled boolean NOT NULL DEFAULT false,
  model_enabled boolean NOT NULL DEFAULT false,
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  updated_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_chatbot_settings(key) VALUES ('SETTINGS') ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_chatbot_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  before_settings jsonb NOT NULL,
  after_settings jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('chatbot.settings.read.all', 'Read application-wide chatbot availability and AI answer settings.'),
  ('chatbot.settings.update.all', 'Turn application-wide public chatbot availability and AI answers on or off.')
ON CONFLICT (code) DO NOTHING;
