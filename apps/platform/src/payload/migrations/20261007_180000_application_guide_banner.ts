import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "eyebrow" varchar;
    ALTER TABLE "_cms_pages_v" ADD COLUMN IF NOT EXISTS "version_eyebrow" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_cms_pages_v" DROP COLUMN IF EXISTS "version_eyebrow";
    ALTER TABLE "cms_pages" DROP COLUMN IF EXISTS "eyebrow";
  `);
}
