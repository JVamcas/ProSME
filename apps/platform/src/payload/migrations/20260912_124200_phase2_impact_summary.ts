import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_homepage_blocks_statistics" ADD COLUMN "summary" varchar;
    ALTER TABLE "_cms_homepage_v_blocks_statistics" ADD COLUMN "summary" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_homepage_blocks_statistics" DROP COLUMN "summary";
    ALTER TABLE "_cms_homepage_v_blocks_statistics" DROP COLUMN "summary";
  `);
}
