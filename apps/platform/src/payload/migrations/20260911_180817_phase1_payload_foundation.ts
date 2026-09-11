import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_principals_status" AS ENUM('active', 'disabled');
  CREATE TYPE "public"."enum_cms_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_resources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_resources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_funding_calls_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_funding_calls_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms_principals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"application_user_id" varchar NOT NULL,
  	"display_name" varchar NOT NULL,
  	"status" "enum_cms_principals_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"content" jsonb,
  	"featured_image_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_content" jsonb,
  	"version_featured_image_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_resources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"category" varchar,
  	"file_id" integer,
  	"external_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_resources_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_resources_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_category" varchar,
  	"version_file_id" integer,
  	"version_external_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_resources_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_funding_calls" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar,
  	"opens_at" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"eligibility" jsonb,
  	"maximum_amount" numeric,
  	"application_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_funding_calls_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_funding_calls_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_opens_at" timestamp(3) with time zone,
  	"version_closes_at" timestamp(3) with time zone,
  	"version_eligibility" jsonb,
  	"version_maximum_amount" numeric,
  	"version_application_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_funding_calls_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_principals_id" integer,
  	"cms_media_id" integer,
  	"cms_pages_id" integer,
  	"cms_news_id" integer,
  	"cms_resources_id" integer,
  	"cms_funding_calls_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_principals_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_featured_image_id_cms_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_pages_v" ADD CONSTRAINT "_cms_pages_v_parent_id_cms_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_pages_v" ADD CONSTRAINT "_cms_pages_v_version_featured_image_id_cms_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_news" ADD CONSTRAINT "cms_news_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_news_v" ADD CONSTRAINT "_cms_news_v_parent_id_cms_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_news_v" ADD CONSTRAINT "_cms_news_v_version_image_id_cms_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_resources" ADD CONSTRAINT "cms_resources_file_id_cms_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_resources_v" ADD CONSTRAINT "_cms_resources_v_parent_id_cms_resources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_resources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_resources_v" ADD CONSTRAINT "_cms_resources_v_version_file_id_cms_media_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_funding_calls_v" ADD CONSTRAINT "_cms_funding_calls_v_parent_id_cms_funding_calls_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_funding_calls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cms_principals_fk" FOREIGN KEY ("cms_principals_id") REFERENCES "public"."cms_principals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("cms_media_id") REFERENCES "public"."cms_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("cms_pages_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("cms_news_id") REFERENCES "public"."cms_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_resources_fk" FOREIGN KEY ("cms_resources_id") REFERENCES "public"."cms_resources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_funding_calls_fk" FOREIGN KEY ("cms_funding_calls_id") REFERENCES "public"."cms_funding_calls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_cms_principals_fk" FOREIGN KEY ("cms_principals_id") REFERENCES "public"."cms_principals"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "cms_principals_email_idx" ON "cms_principals" USING btree ("email");
  CREATE UNIQUE INDEX "cms_principals_application_user_id_idx" ON "cms_principals" USING btree ("application_user_id");
  CREATE INDEX "cms_principals_updated_at_idx" ON "cms_principals" USING btree ("updated_at");
  CREATE INDEX "cms_principals_created_at_idx" ON "cms_principals" USING btree ("created_at");
  CREATE INDEX "cms_media_updated_at_idx" ON "cms_media" USING btree ("updated_at");
  CREATE INDEX "cms_media_created_at_idx" ON "cms_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_media_filename_idx" ON "cms_media" USING btree ("filename");
  CREATE UNIQUE INDEX "cms_pages_slug_idx" ON "cms_pages" USING btree ("slug");
  CREATE INDEX "cms_pages_featured_image_idx" ON "cms_pages" USING btree ("featured_image_id");
  CREATE INDEX "cms_pages_updated_at_idx" ON "cms_pages" USING btree ("updated_at");
  CREATE INDEX "cms_pages_created_at_idx" ON "cms_pages" USING btree ("created_at");
  CREATE INDEX "cms_pages__status_idx" ON "cms_pages" USING btree ("_status");
  CREATE INDEX "_cms_pages_v_parent_idx" ON "_cms_pages_v" USING btree ("parent_id");
  CREATE INDEX "_cms_pages_v_version_version_slug_idx" ON "_cms_pages_v" USING btree ("version_slug");
  CREATE INDEX "_cms_pages_v_version_version_featured_image_idx" ON "_cms_pages_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_cms_pages_v_version_version_updated_at_idx" ON "_cms_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_pages_v_version_version_created_at_idx" ON "_cms_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_pages_v_version_version__status_idx" ON "_cms_pages_v" USING btree ("version__status");
  CREATE INDEX "_cms_pages_v_created_at_idx" ON "_cms_pages_v" USING btree ("created_at");
  CREATE INDEX "_cms_pages_v_updated_at_idx" ON "_cms_pages_v" USING btree ("updated_at");
  CREATE INDEX "_cms_pages_v_latest_idx" ON "_cms_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "cms_news_slug_idx" ON "cms_news" USING btree ("slug");
  CREATE INDEX "cms_news_image_idx" ON "cms_news" USING btree ("image_id");
  CREATE INDEX "cms_news_updated_at_idx" ON "cms_news" USING btree ("updated_at");
  CREATE INDEX "cms_news_created_at_idx" ON "cms_news" USING btree ("created_at");
  CREATE INDEX "cms_news__status_idx" ON "cms_news" USING btree ("_status");
  CREATE INDEX "_cms_news_v_parent_idx" ON "_cms_news_v" USING btree ("parent_id");
  CREATE INDEX "_cms_news_v_version_version_slug_idx" ON "_cms_news_v" USING btree ("version_slug");
  CREATE INDEX "_cms_news_v_version_version_image_idx" ON "_cms_news_v" USING btree ("version_image_id");
  CREATE INDEX "_cms_news_v_version_version_updated_at_idx" ON "_cms_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_news_v_version_version_created_at_idx" ON "_cms_news_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_news_v_version_version__status_idx" ON "_cms_news_v" USING btree ("version__status");
  CREATE INDEX "_cms_news_v_created_at_idx" ON "_cms_news_v" USING btree ("created_at");
  CREATE INDEX "_cms_news_v_updated_at_idx" ON "_cms_news_v" USING btree ("updated_at");
  CREATE INDEX "_cms_news_v_latest_idx" ON "_cms_news_v" USING btree ("latest");
  CREATE INDEX "cms_resources_file_idx" ON "cms_resources" USING btree ("file_id");
  CREATE INDEX "cms_resources_updated_at_idx" ON "cms_resources" USING btree ("updated_at");
  CREATE INDEX "cms_resources_created_at_idx" ON "cms_resources" USING btree ("created_at");
  CREATE INDEX "cms_resources__status_idx" ON "cms_resources" USING btree ("_status");
  CREATE INDEX "_cms_resources_v_parent_idx" ON "_cms_resources_v" USING btree ("parent_id");
  CREATE INDEX "_cms_resources_v_version_version_file_idx" ON "_cms_resources_v" USING btree ("version_file_id");
  CREATE INDEX "_cms_resources_v_version_version_updated_at_idx" ON "_cms_resources_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_resources_v_version_version_created_at_idx" ON "_cms_resources_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_resources_v_version_version__status_idx" ON "_cms_resources_v" USING btree ("version__status");
  CREATE INDEX "_cms_resources_v_created_at_idx" ON "_cms_resources_v" USING btree ("created_at");
  CREATE INDEX "_cms_resources_v_updated_at_idx" ON "_cms_resources_v" USING btree ("updated_at");
  CREATE INDEX "_cms_resources_v_latest_idx" ON "_cms_resources_v" USING btree ("latest");
  CREATE INDEX "cms_funding_calls_updated_at_idx" ON "cms_funding_calls" USING btree ("updated_at");
  CREATE INDEX "cms_funding_calls_created_at_idx" ON "cms_funding_calls" USING btree ("created_at");
  CREATE INDEX "cms_funding_calls__status_idx" ON "cms_funding_calls" USING btree ("_status");
  CREATE INDEX "_cms_funding_calls_v_parent_idx" ON "_cms_funding_calls_v" USING btree ("parent_id");
  CREATE INDEX "_cms_funding_calls_v_version_version_updated_at_idx" ON "_cms_funding_calls_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_funding_calls_v_version_version_created_at_idx" ON "_cms_funding_calls_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_funding_calls_v_version_version__status_idx" ON "_cms_funding_calls_v" USING btree ("version__status");
  CREATE INDEX "_cms_funding_calls_v_created_at_idx" ON "_cms_funding_calls_v" USING btree ("created_at");
  CREATE INDEX "_cms_funding_calls_v_updated_at_idx" ON "_cms_funding_calls_v" USING btree ("updated_at");
  CREATE INDEX "_cms_funding_calls_v_latest_idx" ON "_cms_funding_calls_v" USING btree ("latest");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_cms_principals_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_principals_id");
  CREATE INDEX "payload_locked_documents_rels_cms_media_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_media_id");
  CREATE INDEX "payload_locked_documents_rels_cms_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_pages_id");
  CREATE INDEX "payload_locked_documents_rels_cms_news_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_news_id");
  CREATE INDEX "payload_locked_documents_rels_cms_resources_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_resources_id");
  CREATE INDEX "payload_locked_documents_rels_cms_funding_calls_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_funding_calls_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_cms_principals_id_idx" ON "payload_preferences_rels" USING btree ("cms_principals_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_principals" CASCADE;
  DROP TABLE "cms_media" CASCADE;
  DROP TABLE "cms_pages" CASCADE;
  DROP TABLE "_cms_pages_v" CASCADE;
  DROP TABLE "cms_news" CASCADE;
  DROP TABLE "_cms_news_v" CASCADE;
  DROP TABLE "cms_resources" CASCADE;
  DROP TABLE "_cms_resources_v" CASCADE;
  DROP TABLE "cms_funding_calls" CASCADE;
  DROP TABLE "_cms_funding_calls_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_cms_principals_status";
  DROP TYPE "public"."enum_cms_pages_status";
  DROP TYPE "public"."enum__cms_pages_v_version_status";
  DROP TYPE "public"."enum_cms_news_status";
  DROP TYPE "public"."enum__cms_news_v_version_status";
  DROP TYPE "public"."enum_cms_resources_status";
  DROP TYPE "public"."enum__cms_resources_v_version_status";
  DROP TYPE "public"."enum_cms_funding_calls_status";
  DROP TYPE "public"."enum__cms_funding_calls_v_version_status";`)
}
