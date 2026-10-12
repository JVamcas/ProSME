import {
  sql,
  type MigrateDownArgs,
  type MigrateUpArgs,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_cms_news_v"
      ADD COLUMN IF NOT EXISTS "autosave" boolean;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_cms_news_v" DROP COLUMN IF EXISTS "autosave";
  `);
}
