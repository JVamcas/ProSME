import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_homepage_blocks_statistics" ADD COLUMN "background_image_id" integer;
    ALTER TABLE "_cms_homepage_v_blocks_statistics" ADD COLUMN "background_image_id" integer;
    ALTER TABLE "cms_pages_blocks_statistics" ADD COLUMN "background_image_id" integer;
    ALTER TABLE "_cms_pages_v_blocks_statistics" ADD COLUMN "background_image_id" integer;
    ALTER TABLE "cms_homepage_blocks_statistics" ADD CONSTRAINT "cms_homepage_blocks_statistics_background_image_id_cms_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_cms_homepage_v_blocks_statistics" ADD CONSTRAINT "_cms_homepage_v_blocks_statistics_background_image_id_cms_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "cms_pages_blocks_statistics" ADD CONSTRAINT "cms_pages_blocks_statistics_background_image_id_cms_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_cms_pages_v_blocks_statistics" ADD CONSTRAINT "_cms_pages_v_blocks_statistics_background_image_id_cms_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "cms_homepage_blocks_statistics_background_image_idx" ON "cms_homepage_blocks_statistics" USING btree ("background_image_id");
    CREATE INDEX "_cms_homepage_v_blocks_statistics_background_image_idx" ON "_cms_homepage_v_blocks_statistics" USING btree ("background_image_id");
    CREATE INDEX "cms_pages_blocks_statistics_background_image_idx" ON "cms_pages_blocks_statistics" USING btree ("background_image_id");
    CREATE INDEX "_cms_pages_v_blocks_statistics_background_image_idx" ON "_cms_pages_v_blocks_statistics" USING btree ("background_image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_homepage_blocks_statistics" DROP COLUMN "background_image_id" CASCADE;
    ALTER TABLE "_cms_homepage_v_blocks_statistics" DROP COLUMN "background_image_id" CASCADE;
    ALTER TABLE "cms_pages_blocks_statistics" DROP COLUMN "background_image_id" CASCADE;
    ALTER TABLE "_cms_pages_v_blocks_statistics" DROP COLUMN "background_image_id" CASCADE;
  `);
}
