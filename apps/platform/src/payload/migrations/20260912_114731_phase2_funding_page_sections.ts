import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_pages_blocks_funding_support_cards_icon" AS ENUM('grant', 'mentorship', 'market', 'innovation', 'inclusive', 'growth', 'impact');
  CREATE TYPE "public"."enum_cms_pages_blocks_funding_priorities_items_icon" AS ENUM('grant', 'mentorship', 'market', 'innovation', 'inclusive', 'growth', 'impact');
  CREATE TYPE "public"."enum__cms_pages_v_blocks_funding_support_cards_icon" AS ENUM('grant', 'mentorship', 'market', 'innovation', 'inclusive', 'growth', 'impact');
  CREATE TYPE "public"."enum__cms_pages_v_blocks_funding_priorities_items_icon" AS ENUM('grant', 'mentorship', 'market', 'innovation', 'inclusive', 'growth', 'impact');
  CREATE TABLE "cms_pages_blocks_funding_support_uses" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_funding_support_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_cms_pages_blocks_funding_support_cards_icon",
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_funding_support" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_funding_priorities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_cms_pages_blocks_funding_priorities_items_icon",
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_funding_priorities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_funding_support_uses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_funding_support_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__cms_pages_v_blocks_funding_support_cards_icon",
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_funding_support" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_funding_priorities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__cms_pages_v_blocks_funding_priorities_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_funding_priorities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "cms_pages_blocks_funding_support_uses" ADD CONSTRAINT "cms_pages_blocks_funding_support_uses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages_blocks_funding_support"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_funding_support_cards" ADD CONSTRAINT "cms_pages_blocks_funding_support_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages_blocks_funding_support"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_funding_support" ADD CONSTRAINT "cms_pages_blocks_funding_support_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_funding_priorities_items" ADD CONSTRAINT "cms_pages_blocks_funding_priorities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages_blocks_funding_priorities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_funding_priorities" ADD CONSTRAINT "cms_pages_blocks_funding_priorities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_funding_support_uses" ADD CONSTRAINT "_cms_pages_v_blocks_funding_support_uses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v_blocks_funding_support"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_funding_support_cards" ADD CONSTRAINT "_cms_pages_v_blocks_funding_support_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v_blocks_funding_support"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_funding_support" ADD CONSTRAINT "_cms_pages_v_blocks_funding_support_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_funding_priorities_items" ADD CONSTRAINT "_cms_pages_v_blocks_funding_priorities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v_blocks_funding_priorities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_funding_priorities" ADD CONSTRAINT "_cms_pages_v_blocks_funding_priorities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_pages_blocks_funding_support_uses_order_idx" ON "cms_pages_blocks_funding_support_uses" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_funding_support_uses_parent_id_idx" ON "cms_pages_blocks_funding_support_uses" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_funding_support_cards_order_idx" ON "cms_pages_blocks_funding_support_cards" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_funding_support_cards_parent_id_idx" ON "cms_pages_blocks_funding_support_cards" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_funding_support_order_idx" ON "cms_pages_blocks_funding_support" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_funding_support_parent_id_idx" ON "cms_pages_blocks_funding_support" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_funding_support_path_idx" ON "cms_pages_blocks_funding_support" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_funding_priorities_items_order_idx" ON "cms_pages_blocks_funding_priorities_items" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_funding_priorities_items_parent_id_idx" ON "cms_pages_blocks_funding_priorities_items" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_funding_priorities_order_idx" ON "cms_pages_blocks_funding_priorities" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_funding_priorities_parent_id_idx" ON "cms_pages_blocks_funding_priorities" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_funding_priorities_path_idx" ON "cms_pages_blocks_funding_priorities" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_uses_order_idx" ON "_cms_pages_v_blocks_funding_support_uses" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_uses_parent_id_idx" ON "_cms_pages_v_blocks_funding_support_uses" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_cards_order_idx" ON "_cms_pages_v_blocks_funding_support_cards" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_cards_parent_id_idx" ON "_cms_pages_v_blocks_funding_support_cards" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_order_idx" ON "_cms_pages_v_blocks_funding_support" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_parent_id_idx" ON "_cms_pages_v_blocks_funding_support" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_funding_support_path_idx" ON "_cms_pages_v_blocks_funding_support" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_funding_priorities_items_order_idx" ON "_cms_pages_v_blocks_funding_priorities_items" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_funding_priorities_items_parent_id_idx" ON "_cms_pages_v_blocks_funding_priorities_items" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_funding_priorities_order_idx" ON "_cms_pages_v_blocks_funding_priorities" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_funding_priorities_parent_id_idx" ON "_cms_pages_v_blocks_funding_priorities" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_funding_priorities_path_idx" ON "_cms_pages_v_blocks_funding_priorities" USING btree ("_path");

  INSERT INTO "cms_pages_blocks_funding_support" ("_order", "_parent_id", "_path", "id", "eyebrow", "heading", "description")
  SELECT 0, "id", 'layout', 'funding-support-default', 'What the fund supports', 'Investment in sustainable growth', 'Funding is not intended to simply cover routine operating costs, but to promote growth, competitiveness, and MSMEs’ contribution to Namibia''s economic transformation.' FROM "cms_pages" WHERE "slug" = 'funding' ON CONFLICT DO NOTHING;
  INSERT INTO "cms_pages_blocks_funding_support_uses" ("_order", "_parent_id", "id", "label") SELECT item.* FROM (VALUES
  (0, 'funding-support-default', 'funding-use-equipment', 'Equipment and productive assets'), (1, 'funding-support-default', 'funding-use-market', 'Market expansion and export readiness'), (2, 'funding-support-default', 'funding-use-innovation', 'Product or service innovation'), (3, 'funding-support-default', 'funding-use-systems', 'Business systems and operational improvements'), (4, 'funding-support-default', 'funding-use-jobs', 'Activities that support sustainable job creation')) AS item("_order", "_parent_id", "id", "label") JOIN "cms_pages_blocks_funding_support" ON "cms_pages_blocks_funding_support"."id" = item."_parent_id" ON CONFLICT DO NOTHING;
  INSERT INTO "cms_pages_blocks_funding_support_cards" ("_order", "_parent_id", "id", "icon", "title", "description") SELECT item."_order", item."_parent_id", item."id", item."icon"::"enum_cms_pages_blocks_funding_support_cards_icon", item."title", item."description" FROM (VALUES
  (0, 'funding-support-default', 'funding-card-grant', 'grant', 'Grant funding', 'Growth and expansion capital'), (1, 'funding-support-default', 'funding-card-mentorship', 'mentorship', 'Mentorship', 'Practical coaching and advice'), (2, 'funding-support-default', 'funding-card-market', 'market', 'Market access', 'Linkages and export readiness'), (3, 'funding-support-default', 'funding-card-innovation', 'innovation', 'Innovation', 'Support to compete and adapt')) AS item("_order", "_parent_id", "id", "icon", "title", "description") JOIN "cms_pages_blocks_funding_support" ON "cms_pages_blocks_funding_support"."id" = item."_parent_id" ON CONFLICT DO NOTHING;
  INSERT INTO "cms_pages_blocks_funding_priorities" ("_order", "_parent_id", "_path", "id", "eyebrow", "heading")
  SELECT 1, "id", 'layout', 'funding-priorities-default', 'Priority applicants', 'Built for entrepreneurs creating value' FROM "cms_pages" WHERE "slug" = 'funding' ON CONFLICT DO NOTHING;
  INSERT INTO "cms_pages_blocks_funding_priorities_items" ("_order", "_parent_id", "id", "icon", "title", "description") SELECT item."_order", item."_parent_id", item."id", item."icon"::"enum_cms_pages_blocks_funding_priorities_items_icon", item."title", item."description" FROM (VALUES
  (0, 'funding-priorities-default', 'funding-priority-inclusive', 'inclusive', 'Inclusive ownership', 'Youth-owned and women-owned enterprises are encouraged to apply.'), (1, 'funding-priorities-default', 'funding-priority-growth', 'growth', 'Ready to grow', 'Existing businesses seeking expansion, improvement or access to new markets.'), (2, 'funding-priorities-default', 'funding-priority-impact', 'impact', 'Economic impact', 'Enterprises with the potential to innovate, create employment and diversify the economy.')) AS item("_order", "_parent_id", "id", "icon", "title", "description") JOIN "cms_pages_blocks_funding_priorities" ON "cms_pages_blocks_funding_priorities"."id" = item."_parent_id" ON CONFLICT DO NOTHING;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_pages_blocks_funding_support_uses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_funding_support_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_funding_support" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_funding_priorities_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_funding_priorities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_funding_support_uses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_funding_support_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_funding_support" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_funding_priorities_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_funding_priorities" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_pages_blocks_funding_support_uses" CASCADE;
  DROP TABLE "cms_pages_blocks_funding_support_cards" CASCADE;
  DROP TABLE "cms_pages_blocks_funding_support" CASCADE;
  DROP TABLE "cms_pages_blocks_funding_priorities_items" CASCADE;
  DROP TABLE "cms_pages_blocks_funding_priorities" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_funding_support_uses" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_funding_support_cards" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_funding_support" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_funding_priorities_items" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_funding_priorities" CASCADE;
  DROP TYPE "public"."enum_cms_pages_blocks_funding_support_cards_icon";
  DROP TYPE "public"."enum_cms_pages_blocks_funding_priorities_items_icon";
  DROP TYPE "public"."enum__cms_pages_v_blocks_funding_support_cards_icon";
  DROP TYPE "public"."enum__cms_pages_v_blocks_funding_priorities_items_icon";`)
}
