CREATE TABLE IF NOT EXISTS app_reporting_heatmap_layouts (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  page text NOT NULL,
  viewport_width integer NOT NULL CHECK (viewport_width BETWEEN 100 AND 4000),
  document_height integer NOT NULL CHECK (document_height BETWEEN 100 AND 100000),
  boxes jsonb NOT NULL CHECK (jsonb_typeof(boxes) = 'array' AND jsonb_array_length(boxes) <= 80)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_heatmap_views (
  id uuid PRIMARY KEY,
  layout_id text NOT NULL REFERENCES app_reporting_heatmap_layouts(id),
  max_depth integer NOT NULL CHECK (max_depth BETWEEN 0 AND 100),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_reporting_heatmap_views_period_idx
  ON app_reporting_heatmap_views(occurred_at, layout_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_heatmap_clicks (
  view_id uuid NOT NULL REFERENCES app_reporting_heatmap_views(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence BETWEEN 0 AND 199),
  x integer NOT NULL CHECK (x BETWEEN 0 AND 99),
  y integer NOT NULL CHECK (y BETWEEN 0 AND 99),
  PRIMARY KEY (view_id, sequence)
);
