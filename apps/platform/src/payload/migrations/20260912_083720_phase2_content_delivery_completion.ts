import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_header_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_header_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_footer_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_footer_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_homepage_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_homepage_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_contact_details_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_contact_details_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_site_settings_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_site_settings_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  ALTER TYPE "public"."enum_cms_eligibility_content_kind" ADD VALUE 'checkerQuestion';
  ALTER TYPE "public"."enum__cms_eligibility_content_v_version_kind" ADD VALUE 'checkerQuestion';
  CREATE TABLE "cms_pages_blocks_hero" (
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
  
  CREATE TABLE "cms_pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_call_to_action" (
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
  
  CREATE TABLE "cms_pages_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_resource_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_pages_blocks_faq_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"category" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_hero" (
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
  
  CREATE TABLE "_cms_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_call_to_action" (
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
  
  CREATE TABLE "_cms_pages_v_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_resource_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_pages_v_blocks_faq_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"category" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "cms_resources" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_thumbnail_id" integer;
  ALTER TABLE "cms_events" ADD COLUMN "image_id" integer;
  ALTER TABLE "_cms_events_v" ADD COLUMN "version_image_id" integer;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "image_id" integer;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_image_id" integer;
  ALTER TABLE "cms_eligibility_content" ADD COLUMN "key" varchar;
  ALTER TABLE "cms_eligibility_content" ADD COLUMN "hard_stop" boolean;
  ALTER TABLE "_cms_eligibility_content_v" ADD COLUMN "version_key" varchar;
  ALTER TABLE "_cms_eligibility_content_v" ADD COLUMN "version_hard_stop" boolean;
  ALTER TABLE "cms_header" ADD COLUMN "sign_in_label" varchar DEFAULT 'Sign in';
  ALTER TABLE "cms_header" ADD COLUMN "apply_label" varchar DEFAULT 'Apply Now';
  ALTER TABLE "cms_header" ADD COLUMN "apply_href" varchar DEFAULT '/portal/applications/new';
  ALTER TABLE "cms_header" ADD COLUMN "review_status" "enum_cms_header_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_header" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_cms_header_v" ADD COLUMN "version_sign_in_label" varchar DEFAULT 'Sign in';
  ALTER TABLE "_cms_header_v" ADD COLUMN "version_apply_label" varchar DEFAULT 'Apply Now';
  ALTER TABLE "_cms_header_v" ADD COLUMN "version_apply_href" varchar DEFAULT '/portal/applications/new';
  ALTER TABLE "_cms_header_v" ADD COLUMN "version_review_status" "enum__cms_header_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_header_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "cms_footer" ADD COLUMN "summary" varchar DEFAULT 'Supporting Namibian MSMEs to grow, compete and create opportunities.';
  ALTER TABLE "cms_footer" ADD COLUMN "newsletter_heading" varchar DEFAULT 'Stay in the loop';
  ALTER TABLE "cms_footer" ADD COLUMN "newsletter_summary" varchar DEFAULT 'Get funding-call updates and approved business resources.';
  ALTER TABLE "cms_footer" ADD COLUMN "review_status" "enum_cms_footer_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_footer" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version_summary" varchar DEFAULT 'Supporting Namibian MSMEs to grow, compete and create opportunities.';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version_newsletter_heading" varchar DEFAULT 'Stay in the loop';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version_newsletter_summary" varchar DEFAULT 'Get funding-call updates and approved business resources.';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version_review_status" "enum__cms_footer_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "cms_homepage" ADD COLUMN "hero_image_id" integer;
  ALTER TABLE "cms_homepage" ADD COLUMN "apply_label" varchar DEFAULT 'Apply Now';
  ALTER TABLE "cms_homepage" ADD COLUMN "apply_href" varchar DEFAULT '/portal/applications/new';
  ALTER TABLE "cms_homepage" ADD COLUMN "eligibility_label" varchar DEFAULT 'Check My Eligibility';
  ALTER TABLE "cms_homepage" ADD COLUMN "tracking_label" varchar DEFAULT 'Track Application';
  ALTER TABLE "cms_homepage" ADD COLUMN "hero_panel_heading" varchar DEFAULT 'Bigger businesses. A brighter Namibia.';
  ALTER TABLE "cms_homepage" ADD COLUMN "hero_panel_summary" varchar DEFAULT 'Open to eligible MSMEs from all 14 regions and every sector.';
  ALTER TABLE "cms_homepage" ADD COLUMN "review_status" "enum_cms_homepage_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_homepage" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_hero_image_id" integer;
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_apply_label" varchar DEFAULT 'Apply Now';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_apply_href" varchar DEFAULT '/portal/applications/new';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_eligibility_label" varchar DEFAULT 'Check My Eligibility';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_tracking_label" varchar DEFAULT 'Track Application';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_hero_panel_heading" varchar DEFAULT 'Bigger businesses. A brighter Namibia.';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_hero_panel_summary" varchar DEFAULT 'Open to eligible MSMEs from all 14 regions and every sector.';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_review_status" "enum__cms_homepage_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "cms_contact_details" ADD COLUMN "review_status" "enum_cms_contact_details_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_contact_details" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_cms_contact_details_v" ADD COLUMN "version_review_status" "enum__cms_contact_details_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_contact_details_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "cms_site_settings" ADD COLUMN "default_social_image_id" integer;
  ALTER TABLE "cms_site_settings" ADD COLUMN "review_status" "enum_cms_site_settings_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_site_settings" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_cms_site_settings_v" ADD COLUMN "version_default_social_image_id" integer;
  ALTER TABLE "_cms_site_settings_v" ADD COLUMN "version_review_status" "enum__cms_site_settings_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_site_settings_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "cms_pages_blocks_hero" ADD CONSTRAINT "cms_pages_blocks_hero_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_hero" ADD CONSTRAINT "cms_pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_rich_text" ADD CONSTRAINT "cms_pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_call_to_action" ADD CONSTRAINT "cms_pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_statistics_items" ADD CONSTRAINT "cms_pages_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_statistics" ADD CONSTRAINT "cms_pages_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_resource_grid" ADD CONSTRAINT "cms_pages_blocks_resource_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_pages_blocks_faq_list" ADD CONSTRAINT "cms_pages_blocks_faq_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_hero" ADD CONSTRAINT "_cms_pages_v_blocks_hero_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_hero" ADD CONSTRAINT "_cms_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_rich_text" ADD CONSTRAINT "_cms_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_call_to_action" ADD CONSTRAINT "_cms_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_statistics_items" ADD CONSTRAINT "_cms_pages_v_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_statistics" ADD CONSTRAINT "_cms_pages_v_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_resource_grid" ADD CONSTRAINT "_cms_pages_v_blocks_resource_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_pages_v_blocks_faq_list" ADD CONSTRAINT "_cms_pages_v_blocks_faq_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_pages_blocks_hero_order_idx" ON "cms_pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_hero_parent_id_idx" ON "cms_pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_hero_path_idx" ON "cms_pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_hero_image_idx" ON "cms_pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "cms_pages_blocks_rich_text_order_idx" ON "cms_pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_rich_text_parent_id_idx" ON "cms_pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_rich_text_path_idx" ON "cms_pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_call_to_action_order_idx" ON "cms_pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_call_to_action_parent_id_idx" ON "cms_pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_call_to_action_path_idx" ON "cms_pages_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_statistics_items_order_idx" ON "cms_pages_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_statistics_items_parent_id_idx" ON "cms_pages_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_statistics_order_idx" ON "cms_pages_blocks_statistics" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_statistics_parent_id_idx" ON "cms_pages_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_statistics_path_idx" ON "cms_pages_blocks_statistics" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_resource_grid_order_idx" ON "cms_pages_blocks_resource_grid" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_resource_grid_parent_id_idx" ON "cms_pages_blocks_resource_grid" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_resource_grid_path_idx" ON "cms_pages_blocks_resource_grid" USING btree ("_path");
  CREATE INDEX "cms_pages_blocks_faq_list_order_idx" ON "cms_pages_blocks_faq_list" USING btree ("_order");
  CREATE INDEX "cms_pages_blocks_faq_list_parent_id_idx" ON "cms_pages_blocks_faq_list" USING btree ("_parent_id");
  CREATE INDEX "cms_pages_blocks_faq_list_path_idx" ON "cms_pages_blocks_faq_list" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_hero_order_idx" ON "_cms_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_hero_parent_id_idx" ON "_cms_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_hero_path_idx" ON "_cms_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_hero_image_idx" ON "_cms_pages_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_cms_pages_v_blocks_rich_text_order_idx" ON "_cms_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_rich_text_parent_id_idx" ON "_cms_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_rich_text_path_idx" ON "_cms_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_call_to_action_order_idx" ON "_cms_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_call_to_action_parent_id_idx" ON "_cms_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_call_to_action_path_idx" ON "_cms_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_statistics_items_order_idx" ON "_cms_pages_v_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_statistics_items_parent_id_idx" ON "_cms_pages_v_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_statistics_order_idx" ON "_cms_pages_v_blocks_statistics" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_statistics_parent_id_idx" ON "_cms_pages_v_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_statistics_path_idx" ON "_cms_pages_v_blocks_statistics" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_resource_grid_order_idx" ON "_cms_pages_v_blocks_resource_grid" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_resource_grid_parent_id_idx" ON "_cms_pages_v_blocks_resource_grid" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_resource_grid_path_idx" ON "_cms_pages_v_blocks_resource_grid" USING btree ("_path");
  CREATE INDEX "_cms_pages_v_blocks_faq_list_order_idx" ON "_cms_pages_v_blocks_faq_list" USING btree ("_order");
  CREATE INDEX "_cms_pages_v_blocks_faq_list_parent_id_idx" ON "_cms_pages_v_blocks_faq_list" USING btree ("_parent_id");
  CREATE INDEX "_cms_pages_v_blocks_faq_list_path_idx" ON "_cms_pages_v_blocks_faq_list" USING btree ("_path");
  ALTER TABLE "cms_resources" ADD CONSTRAINT "cms_resources_thumbnail_id_cms_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_resources_v" ADD CONSTRAINT "_cms_resources_v_version_thumbnail_id_cms_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_events_v" ADD CONSTRAINT "_cms_events_v_version_image_id_cms_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_funding_calls" ADD CONSTRAINT "cms_funding_calls_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_funding_calls_v" ADD CONSTRAINT "_cms_funding_calls_v_version_image_id_cms_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_homepage" ADD CONSTRAINT "cms_homepage_hero_image_id_cms_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_homepage_v" ADD CONSTRAINT "_cms_homepage_v_version_hero_image_id_cms_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_site_settings" ADD CONSTRAINT "cms_site_settings_default_social_image_id_cms_media_id_fk" FOREIGN KEY ("default_social_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_site_settings_v" ADD CONSTRAINT "_cms_site_settings_v_version_default_social_image_id_cms_media_id_fk" FOREIGN KEY ("version_default_social_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cms_resources_thumbnail_idx" ON "cms_resources" USING btree ("thumbnail_id");
  CREATE INDEX "_cms_resources_v_version_version_thumbnail_idx" ON "_cms_resources_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "cms_events_image_idx" ON "cms_events" USING btree ("image_id");
  CREATE INDEX "_cms_events_v_version_version_image_idx" ON "_cms_events_v" USING btree ("version_image_id");
  CREATE INDEX "cms_funding_calls_image_idx" ON "cms_funding_calls" USING btree ("image_id");
  CREATE INDEX "_cms_funding_calls_v_version_version_image_idx" ON "_cms_funding_calls_v" USING btree ("version_image_id");
  CREATE INDEX "cms_header_review_status_idx" ON "cms_header" USING btree ("review_status");
  CREATE INDEX "_cms_header_v_version_version_review_status_idx" ON "_cms_header_v" USING btree ("version_review_status");
  CREATE INDEX "cms_footer_review_status_idx" ON "cms_footer" USING btree ("review_status");
  CREATE INDEX "_cms_footer_v_version_version_review_status_idx" ON "_cms_footer_v" USING btree ("version_review_status");
  CREATE INDEX "cms_homepage_hero_image_idx" ON "cms_homepage" USING btree ("hero_image_id");
  CREATE INDEX "cms_homepage_review_status_idx" ON "cms_homepage" USING btree ("review_status");
  CREATE INDEX "_cms_homepage_v_version_version_hero_image_idx" ON "_cms_homepage_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_cms_homepage_v_version_version_review_status_idx" ON "_cms_homepage_v" USING btree ("version_review_status");
  CREATE INDEX "cms_contact_details_review_status_idx" ON "cms_contact_details" USING btree ("review_status");
  CREATE INDEX "_cms_contact_details_v_version_version_review_status_idx" ON "_cms_contact_details_v" USING btree ("version_review_status");
  CREATE INDEX "cms_site_settings_default_social_image_idx" ON "cms_site_settings" USING btree ("default_social_image_id");
  CREATE INDEX "cms_site_settings_review_status_idx" ON "cms_site_settings" USING btree ("review_status");
  CREATE INDEX "_cms_site_settings_v_version_version_default_social_imag_idx" ON "_cms_site_settings_v" USING btree ("version_default_social_image_id");
  CREATE INDEX "_cms_site_settings_v_version_version_review_status_idx" ON "_cms_site_settings_v" USING btree ("version_review_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_pages_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_statistics_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_statistics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_resource_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_pages_blocks_faq_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_statistics_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_statistics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_resource_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_pages_v_blocks_faq_list" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_pages_blocks_hero" CASCADE;
  DROP TABLE "cms_pages_blocks_rich_text" CASCADE;
  DROP TABLE "cms_pages_blocks_call_to_action" CASCADE;
  DROP TABLE "cms_pages_blocks_statistics_items" CASCADE;
  DROP TABLE "cms_pages_blocks_statistics" CASCADE;
  DROP TABLE "cms_pages_blocks_resource_grid" CASCADE;
  DROP TABLE "cms_pages_blocks_faq_list" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_statistics_items" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_statistics" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_resource_grid" CASCADE;
  DROP TABLE "_cms_pages_v_blocks_faq_list" CASCADE;
  ALTER TABLE "cms_resources" DROP CONSTRAINT "cms_resources_thumbnail_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_resources_v" DROP CONSTRAINT "_cms_resources_v_version_thumbnail_id_cms_media_id_fk";
  
  ALTER TABLE "cms_events" DROP CONSTRAINT "cms_events_image_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_events_v" DROP CONSTRAINT "_cms_events_v_version_image_id_cms_media_id_fk";
  
  ALTER TABLE "cms_funding_calls" DROP CONSTRAINT "cms_funding_calls_image_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_funding_calls_v" DROP CONSTRAINT "_cms_funding_calls_v_version_image_id_cms_media_id_fk";
  
  ALTER TABLE "cms_homepage" DROP CONSTRAINT "cms_homepage_hero_image_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_homepage_v" DROP CONSTRAINT "_cms_homepage_v_version_hero_image_id_cms_media_id_fk";
  
  ALTER TABLE "cms_site_settings" DROP CONSTRAINT "cms_site_settings_default_social_image_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_site_settings_v" DROP CONSTRAINT "_cms_site_settings_v_version_default_social_image_id_cms_media_id_fk";
  
  ALTER TABLE "cms_eligibility_content" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_cms_eligibility_content_kind";
  CREATE TYPE "public"."enum_cms_eligibility_content_kind" AS ENUM('criterion', 'focusSector');
  ALTER TABLE "cms_eligibility_content" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_cms_eligibility_content_kind" USING "kind"::"public"."enum_cms_eligibility_content_kind";
  ALTER TABLE "_cms_eligibility_content_v" ALTER COLUMN "version_kind" SET DATA TYPE text;
  DROP TYPE "public"."enum__cms_eligibility_content_v_version_kind";
  CREATE TYPE "public"."enum__cms_eligibility_content_v_version_kind" AS ENUM('criterion', 'focusSector');
  ALTER TABLE "_cms_eligibility_content_v" ALTER COLUMN "version_kind" SET DATA TYPE "public"."enum__cms_eligibility_content_v_version_kind" USING "version_kind"::"public"."enum__cms_eligibility_content_v_version_kind";
  DROP INDEX "cms_resources_thumbnail_idx";
  DROP INDEX "_cms_resources_v_version_version_thumbnail_idx";
  DROP INDEX "cms_events_image_idx";
  DROP INDEX "_cms_events_v_version_version_image_idx";
  DROP INDEX "cms_funding_calls_image_idx";
  DROP INDEX "_cms_funding_calls_v_version_version_image_idx";
  DROP INDEX "cms_header_review_status_idx";
  DROP INDEX "_cms_header_v_version_version_review_status_idx";
  DROP INDEX "cms_footer_review_status_idx";
  DROP INDEX "_cms_footer_v_version_version_review_status_idx";
  DROP INDEX "cms_homepage_hero_image_idx";
  DROP INDEX "cms_homepage_review_status_idx";
  DROP INDEX "_cms_homepage_v_version_version_hero_image_idx";
  DROP INDEX "_cms_homepage_v_version_version_review_status_idx";
  DROP INDEX "cms_contact_details_review_status_idx";
  DROP INDEX "_cms_contact_details_v_version_version_review_status_idx";
  DROP INDEX "cms_site_settings_default_social_image_idx";
  DROP INDEX "cms_site_settings_review_status_idx";
  DROP INDEX "_cms_site_settings_v_version_version_default_social_imag_idx";
  DROP INDEX "_cms_site_settings_v_version_version_review_status_idx";
  ALTER TABLE "cms_resources" DROP COLUMN "thumbnail_id";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_thumbnail_id";
  ALTER TABLE "cms_events" DROP COLUMN "image_id";
  ALTER TABLE "_cms_events_v" DROP COLUMN "version_image_id";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "image_id";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_image_id";
  ALTER TABLE "cms_eligibility_content" DROP COLUMN "key";
  ALTER TABLE "cms_eligibility_content" DROP COLUMN "hard_stop";
  ALTER TABLE "_cms_eligibility_content_v" DROP COLUMN "version_key";
  ALTER TABLE "_cms_eligibility_content_v" DROP COLUMN "version_hard_stop";
  ALTER TABLE "cms_header" DROP COLUMN "sign_in_label";
  ALTER TABLE "cms_header" DROP COLUMN "apply_label";
  ALTER TABLE "cms_header" DROP COLUMN "apply_href";
  ALTER TABLE "cms_header" DROP COLUMN "review_status";
  ALTER TABLE "cms_header" DROP COLUMN "review_notes";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version_sign_in_label";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version_apply_label";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version_apply_href";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "cms_footer" DROP COLUMN "summary";
  ALTER TABLE "cms_footer" DROP COLUMN "newsletter_heading";
  ALTER TABLE "cms_footer" DROP COLUMN "newsletter_summary";
  ALTER TABLE "cms_footer" DROP COLUMN "review_status";
  ALTER TABLE "cms_footer" DROP COLUMN "review_notes";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version_summary";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version_newsletter_heading";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version_newsletter_summary";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "cms_homepage" DROP COLUMN "hero_image_id";
  ALTER TABLE "cms_homepage" DROP COLUMN "apply_label";
  ALTER TABLE "cms_homepage" DROP COLUMN "apply_href";
  ALTER TABLE "cms_homepage" DROP COLUMN "eligibility_label";
  ALTER TABLE "cms_homepage" DROP COLUMN "tracking_label";
  ALTER TABLE "cms_homepage" DROP COLUMN "hero_panel_heading";
  ALTER TABLE "cms_homepage" DROP COLUMN "hero_panel_summary";
  ALTER TABLE "cms_homepage" DROP COLUMN "review_status";
  ALTER TABLE "cms_homepage" DROP COLUMN "review_notes";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_hero_image_id";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_apply_label";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_apply_href";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_eligibility_label";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_tracking_label";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_hero_panel_heading";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_hero_panel_summary";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "cms_contact_details" DROP COLUMN "review_status";
  ALTER TABLE "cms_contact_details" DROP COLUMN "review_notes";
  ALTER TABLE "_cms_contact_details_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_contact_details_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "cms_site_settings" DROP COLUMN "default_social_image_id";
  ALTER TABLE "cms_site_settings" DROP COLUMN "review_status";
  ALTER TABLE "cms_site_settings" DROP COLUMN "review_notes";
  ALTER TABLE "_cms_site_settings_v" DROP COLUMN "version_default_social_image_id";
  ALTER TABLE "_cms_site_settings_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_site_settings_v" DROP COLUMN "version_review_notes";
  DROP TYPE "public"."enum_cms_header_review_status";
  DROP TYPE "public"."enum__cms_header_v_version_review_status";
  DROP TYPE "public"."enum_cms_footer_review_status";
  DROP TYPE "public"."enum__cms_footer_v_version_review_status";
  DROP TYPE "public"."enum_cms_homepage_review_status";
  DROP TYPE "public"."enum__cms_homepage_v_version_review_status";
  DROP TYPE "public"."enum_cms_contact_details_review_status";
  DROP TYPE "public"."enum__cms_contact_details_v_version_review_status";
  DROP TYPE "public"."enum_cms_site_settings_review_status";
  DROP TYPE "public"."enum__cms_site_settings_v_version_review_status";`)
}
