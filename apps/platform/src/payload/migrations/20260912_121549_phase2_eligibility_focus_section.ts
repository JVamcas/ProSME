import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms_pages_blocks_eligibility_focus_sectors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"notice_heading" varchar,
  	"notice" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_eligibility_focus_sectors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"notice_heading" varchar,
  	"notice" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "cms_pages_blocks_eligibility_focus_sectors" ADD CONSTRAINT "cms_pages_blocks_eligibility_focus_sectors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_eligibility_focus_sectors" ADD CONSTRAINT "_cms_pages_v_blocks_eligibility_focus_sectors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_pages_blocks_eligibility_focus_sectors_order_idx" ON "cms_pages_blocks_eligibility_focus_sectors" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_eligibility_focus_sectors_parent_id_idx" ON "cms_pages_blocks_eligibility_focus_sectors" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_eligibility_focus_sectors_path_idx" ON "cms_pages_blocks_eligibility_focus_sectors" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_eligibility_focus_sectors_order_idx" ON "_cms_pages_v_blocks_eligibility_focus_sectors" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_eligibility_focus_sectors_parent_id_idx" ON "_cms_pages_v_blocks_eligibility_focus_sectors" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_eligibility_focus_sectors_path_idx" ON "_cms_pages_v_blocks_eligibility_focus_sectors" USING btree ("_path");
  INSERT INTO "cms_pages_blocks_eligibility_focus_sectors" ("_order", "_parent_id", "_path", "id", "eyebrow", "heading", "notice_heading", "notice")
  SELECT 0, "id", 'layout', 'eligibility-focus-default', 'Focus sectors', 'Priority areas for consideration', 'All sectors may apply.', 'Focus sectors indicate priority areas; they are not an exclusion list.' FROM "cms_pages" WHERE "slug" = 'eligibility' ON CONFLICT DO NOTHING;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_pages_blocks_eligibility_focus_sectors" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_eligibility_focus_sectors" CASCADE;`)
}
