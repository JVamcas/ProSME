import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms_homepage_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"summary" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"summary" varchar,
  	"label" varchar,
  	"href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_resource_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_homepage_blocks_faq_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"category" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"summary" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"summary" varchar,
  	"label" varchar,
  	"href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_resource_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_homepage_v_blocks_faq_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"category" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "cms_homepage_blocks_hero" ADD CONSTRAINT "cms_homepage_blocks_hero_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_hero" ADD CONSTRAINT "cms_homepage_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_rich_text" ADD CONSTRAINT "cms_homepage_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_call_to_action" ADD CONSTRAINT "cms_homepage_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_statistics_items" ADD CONSTRAINT "cms_homepage_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_statistics" ADD CONSTRAINT "cms_homepage_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_resource_grid" ADD CONSTRAINT "cms_homepage_blocks_resource_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_homepage_blocks_faq_list" ADD CONSTRAINT "cms_homepage_blocks_faq_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_hero" ADD CONSTRAINT "_cms_homepage_v_blocks_hero_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_hero" ADD CONSTRAINT "_cms_homepage_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_rich_text" ADD CONSTRAINT "_cms_homepage_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_call_to_action" ADD CONSTRAINT "_cms_homepage_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_statistics_items" ADD CONSTRAINT "_cms_homepage_v_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_statistics" ADD CONSTRAINT "_cms_homepage_v_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_resource_grid" ADD CONSTRAINT "_cms_homepage_v_blocks_resource_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v_blocks_faq_list" ADD CONSTRAINT "_cms_homepage_v_blocks_faq_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_homepage_blocks_hero_order_idx" ON "cms_homepage_blocks_hero" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_hero_parent_id_idx" ON "cms_homepage_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_hero_path_idx" ON "cms_homepage_blocks_hero" USING btree ("_path");
  CREATE INDEX "cms_homepage_blocks_hero_image_idx" ON "cms_homepage_blocks_hero" USING btree ("image_id");
  CREATE INDEX "cms_homepage_blocks_rich_text_order_idx" ON "cms_homepage_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_rich_text_parent_id_idx" ON "cms_homepage_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_rich_text_path_idx" ON "cms_homepage_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "cms_homepage_blocks_call_to_action_order_idx" ON "cms_homepage_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_call_to_action_parent_id_idx" ON "cms_homepage_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_call_to_action_path_idx" ON "cms_homepage_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "cms_homepage_blocks_statistics_items_order_idx" ON "cms_homepage_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_statistics_items_parent_id_idx" ON "cms_homepage_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_statistics_order_idx" ON "cms_homepage_blocks_statistics" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_statistics_parent_id_idx" ON "cms_homepage_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_statistics_path_idx" ON "cms_homepage_blocks_statistics" USING btree ("_path");
  CREATE INDEX "cms_homepage_blocks_resource_grid_order_idx" ON "cms_homepage_blocks_resource_grid" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_resource_grid_parent_id_idx" ON "cms_homepage_blocks_resource_grid" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_resource_grid_path_idx" ON "cms_homepage_blocks_resource_grid" USING btree ("_path");
  CREATE INDEX "cms_homepage_blocks_faq_list_order_idx" ON "cms_homepage_blocks_faq_list" USING btree ("_order");
  CREATE INDEX "cms_homepage_blocks_faq_list_parent_id_idx" ON "cms_homepage_blocks_faq_list" USING btree ("_parent_id");
  CREATE INDEX "cms_homepage_blocks_faq_list_path_idx" ON "cms_homepage_blocks_faq_list" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_hero_order_idx" ON "_cms_homepage_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_hero_parent_id_idx" ON "_cms_homepage_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_hero_path_idx" ON "_cms_homepage_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_hero_image_idx" ON "_cms_homepage_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_cms_homepage_v_blocks_rich_text_order_idx" ON "_cms_homepage_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_rich_text_parent_id_idx" ON "_cms_homepage_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_rich_text_path_idx" ON "_cms_homepage_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_call_to_action_order_idx" ON "_cms_homepage_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_call_to_action_parent_id_idx" ON "_cms_homepage_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_call_to_action_path_idx" ON "_cms_homepage_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_statistics_items_order_idx" ON "_cms_homepage_v_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_statistics_items_parent_id_idx" ON "_cms_homepage_v_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_statistics_order_idx" ON "_cms_homepage_v_blocks_statistics" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_statistics_parent_id_idx" ON "_cms_homepage_v_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_statistics_path_idx" ON "_cms_homepage_v_blocks_statistics" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_resource_grid_order_idx" ON "_cms_homepage_v_blocks_resource_grid" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_resource_grid_parent_id_idx" ON "_cms_homepage_v_blocks_resource_grid" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_resource_grid_path_idx" ON "_cms_homepage_v_blocks_resource_grid" USING btree ("_path");
  CREATE INDEX "_cms_homepage_v_blocks_faq_list_order_idx" ON "_cms_homepage_v_blocks_faq_list" USING btree ("_order");
  CREATE INDEX "_cms_homepage_v_blocks_faq_list_parent_id_idx" ON "_cms_homepage_v_blocks_faq_list" USING btree ("_parent_id");
  CREATE INDEX "_cms_homepage_v_blocks_faq_list_path_idx" ON "_cms_homepage_v_blocks_faq_list" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_homepage_blocks_hero" CASCADE;
  DROP TABLE "cms_homepage_blocks_rich_text" CASCADE;
  DROP TABLE "cms_homepage_blocks_call_to_action" CASCADE;
  DROP TABLE "cms_homepage_blocks_statistics_items" CASCADE;
  DROP TABLE "cms_homepage_blocks_statistics" CASCADE;
  DROP TABLE "cms_homepage_blocks_resource_grid" CASCADE;
  DROP TABLE "cms_homepage_blocks_faq_list" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_hero" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_rich_text" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_statistics_items" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_statistics" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_resource_grid" CASCADE;
  DROP TABLE "_cms_homepage_v_blocks_faq_list" CASCADE;`)
}
