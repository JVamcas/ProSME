import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cms_public_page_visibility (
      id serial PRIMARY KEY,
      visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamp(3) with time zone,
      created_at timestamp(3) with time zone
    );
    INSERT INTO cms_public_page_visibility (visibility, updated_at, created_at)
      SELECT '{}'::jsonb, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM cms_public_page_visibility);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS cms_public_page_visibility;`);
}
