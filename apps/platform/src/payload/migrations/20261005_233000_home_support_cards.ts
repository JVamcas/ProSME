import { sql, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      initialize_home boolean := to_regclass('public.cms_homepage_support_cards') IS NULL;
      initialize_versions boolean := to_regclass('public._cms_homepage_v_version_support_cards') IS NULL;
      cards jsonb;
    BEGIN
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('label', label, 'description', description) ORDER BY "order", id),
        '[
          {"label":"Youth-owned businesses","description":"Supporting young entrepreneurs to build a brighter future."},
          {"label":"Women-owned businesses","description":"Backing women-led enterprises to grow and create opportunities."},
          {"label":"Growth-stage MSMEs","description":"Helping established MSMEs scale, innovate and create jobs."},
          {"label":"Businesses in priority sectors","description":"Including green economy, agro-processing, tourism, manufacturing and more."}
        ]'::jsonb
      ) INTO cards
      FROM "cms_eligibility_content"
      WHERE "kind" = 'criterion' AND "_status" = 'published';

      CREATE TABLE IF NOT EXISTS "cms_homepage_support_cards" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms_homepage"("id") ON DELETE cascade,
        "id" varchar PRIMARY KEY NOT NULL,
        "label" varchar,
        "description" varchar
      );
      CREATE INDEX IF NOT EXISTS "cms_homepage_support_cards_order_idx"
        ON "cms_homepage_support_cards" ("_order");
      CREATE INDEX IF NOT EXISTS "cms_homepage_support_cards_parent_id_idx"
        ON "cms_homepage_support_cards" ("_parent_id");

      CREATE TABLE IF NOT EXISTS "_cms_homepage_v_version_support_cards" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "_cms_homepage_v"("id") ON DELETE cascade,
        "id" serial PRIMARY KEY NOT NULL,
        "label" varchar,
        "description" varchar,
        "_uuid" varchar
      );
      CREATE INDEX IF NOT EXISTS "_cms_homepage_v_version_support_cards_order_idx"
        ON "_cms_homepage_v_version_support_cards" ("_order");
      CREATE INDEX IF NOT EXISTS "_cms_homepage_v_version_support_cards_parent_id_idx"
        ON "_cms_homepage_v_version_support_cards" ("_parent_id");

      IF initialize_home THEN
        INSERT INTO "cms_homepage_support_cards" ("_order", "_parent_id", "id", "label", "description")
        SELECT item.ordinality, home.id,
          md5(home.id::text || ':support:' || item.ordinality::text),
          item.card->>'label', item.card->>'description'
        FROM "cms_homepage" home
        CROSS JOIN jsonb_array_elements(cards) WITH ORDINALITY AS item(card, ordinality);
      END IF;

      IF initialize_versions THEN
        INSERT INTO "_cms_homepage_v_version_support_cards" ("_order", "_parent_id", "label", "description", "_uuid")
        SELECT item.ordinality, version.id,
          item.card->>'label', item.card->>'description',
          md5(version.id::text || ':support:' || item.ordinality::text)
        FROM "_cms_homepage_v" version
        CROSS JOIN jsonb_array_elements(cards) WITH ORDINALITY AS item(card, ordinality);
      END IF;
    END
    $$;
  `);
}
