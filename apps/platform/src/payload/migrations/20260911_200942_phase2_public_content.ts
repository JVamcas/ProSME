import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_pages_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_pages_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_news_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_news_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_resources_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_resources_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_events_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_events_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_faqs_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_faqs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_faqs_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_faqs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_funding_calls_call_status" AS ENUM('upcoming', 'open', 'closed');
  CREATE TYPE "public"."enum_cms_funding_calls_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_funding_calls_v_version_call_status" AS ENUM('upcoming', 'open', 'closed');
  CREATE TYPE "public"."enum__cms_funding_calls_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_eligibility_content_kind" AS ENUM('criterion', 'focusSector');
  CREATE TYPE "public"."enum_cms_eligibility_content_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_eligibility_content_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_eligibility_content_v_version_kind" AS ENUM('criterion', 'focusSector');
  CREATE TYPE "public"."enum__cms_eligibility_content_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_eligibility_content_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_programme_statistics_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum_cms_programme_statistics_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_programme_statistics_v_version_review_status" AS ENUM('draft', 'inReview', 'approved');
  CREATE TYPE "public"."enum__cms_programme_statistics_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_contact_submissions_status" AS ENUM('new', 'inProgress', 'resolved');
  CREATE TYPE "public"."enum_cms_newsletter_subscriptions_status" AS ENUM('subscribed', 'unsubscribed');
  CREATE TABLE "cms_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"location" varchar,
  	"registration_url" varchar,
  	"review_status" "enum_cms_events_review_status" DEFAULT 'draft',
  	"review_notes" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"exclude_from_search" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_registration_url" varchar,
  	"version_review_status" "enum__cms_events_v_version_review_status" DEFAULT 'draft',
  	"version_review_notes" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_exclude_from_search" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"category" varchar DEFAULT 'General',
  	"order" numeric DEFAULT 0,
  	"review_status" "enum_cms_faqs_review_status" DEFAULT 'draft',
  	"review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_faqs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"version_category" varchar DEFAULT 'General',
  	"version_order" numeric DEFAULT 0,
  	"version_review_status" "enum__cms_faqs_v_version_review_status" DEFAULT 'draft',
  	"version_review_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_faqs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_eligibility_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"kind" "enum_cms_eligibility_content_kind",
  	"order" numeric DEFAULT 0,
  	"review_status" "enum_cms_eligibility_content_review_status" DEFAULT 'draft',
  	"review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_eligibility_content_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_eligibility_content_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_label" varchar,
  	"version_description" varchar,
  	"version_kind" "enum__cms_eligibility_content_v_version_kind",
  	"version_order" numeric DEFAULT 0,
  	"version_review_status" "enum__cms_eligibility_content_v_version_review_status" DEFAULT 'draft',
  	"version_review_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_eligibility_content_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_programme_statistics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"order" numeric DEFAULT 0,
  	"review_status" "enum_cms_programme_statistics_review_status" DEFAULT 'draft',
  	"review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_programme_statistics_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_programme_statistics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_value" varchar,
  	"version_label" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_review_status" "enum__cms_programme_statistics_v_version_review_status" DEFAULT 'draft',
  	"version_review_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_programme_statistics_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_contact_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "enum_cms_contact_submissions_status" DEFAULT 'new' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_newsletter_subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "enum_cms_newsletter_subscriptions_status" DEFAULT 'subscribed' NOT NULL,
  	"source" varchar DEFAULT 'website',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_content_audit_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection" varchar NOT NULL,
  	"document_id" varchar NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_id" varchar NOT NULL,
  	"actor_email" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_header_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "cms_header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"announcement" varchar DEFAULT 'An initiative under the ProSME Project',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_header_v_version_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_header_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_announcement" varchar DEFAULT 'An initiative under the ProSME Project',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tagline" varchar DEFAULT 'Funding today. A stronger tomorrow.',
  	"copyright" varchar DEFAULT '© 2026 SME Fund Namibia. All rights reserved.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_footer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_tagline" varchar DEFAULT 'Funding today. A stronger tomorrow.',
  	"version_copyright" varchar DEFAULT '© 2026 SME Fund Namibia. All rights reserved.',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar DEFAULT 'Funding today. A stronger tomorrow.',
  	"title" varchar DEFAULT 'Your business has potential. We help you take the next step.',
  	"summary" varchar DEFAULT 'Funding and business development support for Namibian MSMEs ready to grow.',
  	"news_heading" varchar DEFAULT 'Latest news & resources',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_homepage_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_eyebrow" varchar DEFAULT 'Funding today. A stronger tomorrow.',
  	"version_title" varchar DEFAULT 'Your business has potential. We help you take the next step.',
  	"version_summary" varchar DEFAULT 'Funding and business development support for Namibian MSMEs ready to grow.',
  	"version_news_heading" varchar DEFAULT 'Latest news & resources',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_contact_details" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar DEFAULT 'info@smefund.na' NOT NULL,
  	"address" varchar DEFAULT 'Namibia Investment Promotion and Development Board, Windhoek, Namibia' NOT NULL,
  	"phone" varchar,
  	"office_hours" varchar DEFAULT 'Monday to Friday, 08:00–17:00',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_contact_details_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_email" varchar DEFAULT 'info@smefund.na' NOT NULL,
  	"version_address" varchar DEFAULT 'Namibia Investment Promotion and Development Board, Windhoek, Namibia' NOT NULL,
  	"version_phone" varchar,
  	"version_office_hours" varchar DEFAULT 'Monday to Friday, 08:00–17:00',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'SME Fund Namibia' NOT NULL,
  	"site_description" varchar DEFAULT 'Funding and business development support for Namibian MSMEs.' NOT NULL,
  	"analytics_measurement_id" varchar,
  	"allow_indexing" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_site_name" varchar DEFAULT 'SME Fund Namibia' NOT NULL,
  	"version_site_description" varchar DEFAULT 'Funding and business development support for Namibian MSMEs.' NOT NULL,
  	"version_analytics_measurement_id" varchar,
  	"version_allow_indexing" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms_pages" ADD COLUMN "review_status" "enum_cms_pages_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_pages" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "cms_pages" ADD COLUMN "exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "_cms_pages_v" ADD COLUMN "version_review_status" "enum__cms_pages_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_pages_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "_cms_pages_v" ADD COLUMN "version_exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "cms_news" ADD COLUMN "review_status" "enum_cms_news_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_news" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "cms_news" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "cms_news" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "cms_news" ADD COLUMN "exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "_cms_news_v" ADD COLUMN "version_review_status" "enum__cms_news_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_news_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "_cms_news_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_cms_news_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_cms_news_v" ADD COLUMN "version_exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "cms_resources" ADD COLUMN "slug" varchar;
  ALTER TABLE "cms_resources" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "cms_resources" ADD COLUMN "review_status" "enum_cms_resources_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_resources" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "cms_resources" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "cms_resources" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "cms_resources" ADD COLUMN "exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_published_at" timestamp(3) with time zone;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_review_status" "enum__cms_resources_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_cms_resources_v" ADD COLUMN "version_exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "slug" varchar;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "call_status" "enum_cms_funding_calls_call_status" DEFAULT 'upcoming';
  ALTER TABLE "cms_funding_calls" ADD COLUMN "minimum_amount" numeric;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "review_status" "enum_cms_funding_calls_review_status" DEFAULT 'draft';
  ALTER TABLE "cms_funding_calls" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "cms_funding_calls" ADD COLUMN "exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_call_status" "enum__cms_funding_calls_v_version_call_status" DEFAULT 'upcoming';
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_minimum_amount" numeric;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_review_status" "enum__cms_funding_calls_v_version_review_status" DEFAULT 'draft';
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_cms_funding_calls_v" ADD COLUMN "version_exclude_from_search" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_faqs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_eligibility_content_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_programme_statistics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_contact_submissions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_newsletter_subscriptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_content_audit_entries_id" integer;
  ALTER TABLE "_cms_events_v" ADD CONSTRAINT "_cms_events_v_parent_id_cms_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_faqs_v" ADD CONSTRAINT "_cms_faqs_v_parent_id_cms_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_eligibility_content_v" ADD CONSTRAINT "_cms_eligibility_content_v_parent_id_cms_eligibility_content_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_eligibility_content"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_programme_statistics_v" ADD CONSTRAINT "_cms_programme_statistics_v_parent_id_cms_programme_statistics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_programme_statistics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_header_navigation" ADD CONSTRAINT "cms_header_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_header_v_version_navigation" ADD CONSTRAINT "_cms_header_v_version_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_header_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "cms_events_slug_idx" ON "cms_events" USING btree ("slug");
  CREATE INDEX "cms_events_review_status_idx" ON "cms_events" USING btree ("review_status");
  CREATE INDEX "cms_events_updated_at_idx" ON "cms_events" USING btree ("updated_at");
  CREATE INDEX "cms_events_created_at_idx" ON "cms_events" USING btree ("created_at");
  CREATE INDEX "cms_events__status_idx" ON "cms_events" USING btree ("_status");
  CREATE INDEX "_cms_events_v_parent_idx" ON "_cms_events_v" USING btree ("parent_id");
  CREATE INDEX "_cms_events_v_version_version_slug_idx" ON "_cms_events_v" USING btree ("version_slug");
  CREATE INDEX "_cms_events_v_version_version_review_status_idx" ON "_cms_events_v" USING btree ("version_review_status");
  CREATE INDEX "_cms_events_v_version_version_updated_at_idx" ON "_cms_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_events_v_version_version_created_at_idx" ON "_cms_events_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_events_v_version_version__status_idx" ON "_cms_events_v" USING btree ("version__status");
  CREATE INDEX "_cms_events_v_created_at_idx" ON "_cms_events_v" USING btree ("created_at");
  CREATE INDEX "_cms_events_v_updated_at_idx" ON "_cms_events_v" USING btree ("updated_at");
  CREATE INDEX "_cms_events_v_latest_idx" ON "_cms_events_v" USING btree ("latest");
  CREATE INDEX "cms_faqs_review_status_idx" ON "cms_faqs" USING btree ("review_status");
  CREATE INDEX "cms_faqs_updated_at_idx" ON "cms_faqs" USING btree ("updated_at");
  CREATE INDEX "cms_faqs_created_at_idx" ON "cms_faqs" USING btree ("created_at");
  CREATE INDEX "cms_faqs__status_idx" ON "cms_faqs" USING btree ("_status");
  CREATE INDEX "_cms_faqs_v_parent_idx" ON "_cms_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_cms_faqs_v_version_version_review_status_idx" ON "_cms_faqs_v" USING btree ("version_review_status");
  CREATE INDEX "_cms_faqs_v_version_version_updated_at_idx" ON "_cms_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_faqs_v_version_version_created_at_idx" ON "_cms_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_faqs_v_version_version__status_idx" ON "_cms_faqs_v" USING btree ("version__status");
  CREATE INDEX "_cms_faqs_v_created_at_idx" ON "_cms_faqs_v" USING btree ("created_at");
  CREATE INDEX "_cms_faqs_v_updated_at_idx" ON "_cms_faqs_v" USING btree ("updated_at");
  CREATE INDEX "_cms_faqs_v_latest_idx" ON "_cms_faqs_v" USING btree ("latest");
  CREATE INDEX "cms_eligibility_content_review_status_idx" ON "cms_eligibility_content" USING btree ("review_status");
  CREATE INDEX "cms_eligibility_content_updated_at_idx" ON "cms_eligibility_content" USING btree ("updated_at");
  CREATE INDEX "cms_eligibility_content_created_at_idx" ON "cms_eligibility_content" USING btree ("created_at");
  CREATE INDEX "cms_eligibility_content__status_idx" ON "cms_eligibility_content" USING btree ("_status");
  CREATE INDEX "_cms_eligibility_content_v_parent_idx" ON "_cms_eligibility_content_v" USING btree ("parent_id");
  CREATE INDEX "_cms_eligibility_content_v_version_version_review_status_idx" ON "_cms_eligibility_content_v" USING btree ("version_review_status");
  CREATE INDEX "_cms_eligibility_content_v_version_version_updated_at_idx" ON "_cms_eligibility_content_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_eligibility_content_v_version_version_created_at_idx" ON "_cms_eligibility_content_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_eligibility_content_v_version_version__status_idx" ON "_cms_eligibility_content_v" USING btree ("version__status");
  CREATE INDEX "_cms_eligibility_content_v_created_at_idx" ON "_cms_eligibility_content_v" USING btree ("created_at");
  CREATE INDEX "_cms_eligibility_content_v_updated_at_idx" ON "_cms_eligibility_content_v" USING btree ("updated_at");
  CREATE INDEX "_cms_eligibility_content_v_latest_idx" ON "_cms_eligibility_content_v" USING btree ("latest");
  CREATE INDEX "cms_programme_statistics_review_status_idx" ON "cms_programme_statistics" USING btree ("review_status");
  CREATE INDEX "cms_programme_statistics_updated_at_idx" ON "cms_programme_statistics" USING btree ("updated_at");
  CREATE INDEX "cms_programme_statistics_created_at_idx" ON "cms_programme_statistics" USING btree ("created_at");
  CREATE INDEX "cms_programme_statistics__status_idx" ON "cms_programme_statistics" USING btree ("_status");
  CREATE INDEX "_cms_programme_statistics_v_parent_idx" ON "_cms_programme_statistics_v" USING btree ("parent_id");
  CREATE INDEX "_cms_programme_statistics_v_version_version_review_statu_idx" ON "_cms_programme_statistics_v" USING btree ("version_review_status");
  CREATE INDEX "_cms_programme_statistics_v_version_version_updated_at_idx" ON "_cms_programme_statistics_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_programme_statistics_v_version_version_created_at_idx" ON "_cms_programme_statistics_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_programme_statistics_v_version_version__status_idx" ON "_cms_programme_statistics_v" USING btree ("version__status");
  CREATE INDEX "_cms_programme_statistics_v_created_at_idx" ON "_cms_programme_statistics_v" USING btree ("created_at");
  CREATE INDEX "_cms_programme_statistics_v_updated_at_idx" ON "_cms_programme_statistics_v" USING btree ("updated_at");
  CREATE INDEX "_cms_programme_statistics_v_latest_idx" ON "_cms_programme_statistics_v" USING btree ("latest");
  CREATE INDEX "cms_contact_submissions_email_idx" ON "cms_contact_submissions" USING btree ("email");
  CREATE INDEX "cms_contact_submissions_updated_at_idx" ON "cms_contact_submissions" USING btree ("updated_at");
  CREATE INDEX "cms_contact_submissions_created_at_idx" ON "cms_contact_submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_newsletter_subscriptions_email_idx" ON "cms_newsletter_subscriptions" USING btree ("email");
  CREATE INDEX "cms_newsletter_subscriptions_updated_at_idx" ON "cms_newsletter_subscriptions" USING btree ("updated_at");
  CREATE INDEX "cms_newsletter_subscriptions_created_at_idx" ON "cms_newsletter_subscriptions" USING btree ("created_at");
  CREATE INDEX "cms_content_audit_entries_collection_idx" ON "cms_content_audit_entries" USING btree ("collection");
  CREATE INDEX "cms_content_audit_entries_document_id_idx" ON "cms_content_audit_entries" USING btree ("document_id");
  CREATE INDEX "cms_content_audit_entries_updated_at_idx" ON "cms_content_audit_entries" USING btree ("updated_at");
  CREATE INDEX "cms_content_audit_entries_created_at_idx" ON "cms_content_audit_entries" USING btree ("created_at");
  CREATE INDEX "cms_header_navigation_order_idx" ON "cms_header_navigation" USING btree ("_order");
  CREATE INDEX "cms_header_navigation_parent_id_idx" ON "cms_header_navigation" USING btree ("_parent_id");
  CREATE INDEX "_cms_header_v_version_navigation_order_idx" ON "_cms_header_v_version_navigation" USING btree ("_order");
  CREATE INDEX "_cms_header_v_version_navigation_parent_id_idx" ON "_cms_header_v_version_navigation" USING btree ("_parent_id");
  CREATE INDEX "_cms_header_v_created_at_idx" ON "_cms_header_v" USING btree ("created_at");
  CREATE INDEX "_cms_header_v_updated_at_idx" ON "_cms_header_v" USING btree ("updated_at");
  CREATE INDEX "_cms_footer_v_created_at_idx" ON "_cms_footer_v" USING btree ("created_at");
  CREATE INDEX "_cms_footer_v_updated_at_idx" ON "_cms_footer_v" USING btree ("updated_at");
  CREATE INDEX "_cms_homepage_v_created_at_idx" ON "_cms_homepage_v" USING btree ("created_at");
  CREATE INDEX "_cms_homepage_v_updated_at_idx" ON "_cms_homepage_v" USING btree ("updated_at");
  CREATE INDEX "_cms_contact_details_v_created_at_idx" ON "_cms_contact_details_v" USING btree ("created_at");
  CREATE INDEX "_cms_contact_details_v_updated_at_idx" ON "_cms_contact_details_v" USING btree ("updated_at");
  CREATE INDEX "_cms_site_settings_v_created_at_idx" ON "_cms_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_cms_site_settings_v_updated_at_idx" ON "_cms_site_settings_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("cms_events_id") REFERENCES "public"."cms_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("cms_faqs_id") REFERENCES "public"."cms_faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_eligibility_content_fk" FOREIGN KEY ("cms_eligibility_content_id") REFERENCES "public"."cms_eligibility_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_programme_statistics_fk" FOREIGN KEY ("cms_programme_statistics_id") REFERENCES "public"."cms_programme_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk" FOREIGN KEY ("cms_contact_submissions_id") REFERENCES "public"."cms_contact_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_subscriptions_fk" FOREIGN KEY ("cms_newsletter_subscriptions_id") REFERENCES "public"."cms_newsletter_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_audit_entries_fk" FOREIGN KEY ("cms_content_audit_entries_id") REFERENCES "public"."cms_content_audit_entries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_pages_review_status_idx" ON "cms_pages" USING btree ("review_status");
  CREATE INDEX "_cms_pages_v_version_version_review_status_idx" ON "_cms_pages_v" USING btree ("version_review_status");
  CREATE INDEX "cms_news_review_status_idx" ON "cms_news" USING btree ("review_status");
  CREATE INDEX "_cms_news_v_version_version_review_status_idx" ON "_cms_news_v" USING btree ("version_review_status");
  CREATE UNIQUE INDEX "cms_resources_slug_idx" ON "cms_resources" USING btree ("slug");
  CREATE INDEX "cms_resources_review_status_idx" ON "cms_resources" USING btree ("review_status");
  CREATE INDEX "_cms_resources_v_version_version_slug_idx" ON "_cms_resources_v" USING btree ("version_slug");
  CREATE INDEX "_cms_resources_v_version_version_review_status_idx" ON "_cms_resources_v" USING btree ("version_review_status");
  CREATE UNIQUE INDEX "cms_funding_calls_slug_idx" ON "cms_funding_calls" USING btree ("slug");
  CREATE INDEX "cms_funding_calls_review_status_idx" ON "cms_funding_calls" USING btree ("review_status");
  CREATE INDEX "_cms_funding_calls_v_version_version_slug_idx" ON "_cms_funding_calls_v" USING btree ("version_slug");
  CREATE INDEX "_cms_funding_calls_v_version_version_review_status_idx" ON "_cms_funding_calls_v" USING btree ("version_review_status");
  CREATE INDEX "payload_locked_documents_rels_cms_events_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_events_id");
  CREATE INDEX "payload_locked_documents_rels_cms_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_faqs_id");
  CREATE INDEX "payload_locked_documents_rels_cms_eligibility_content_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_eligibility_content_id");
  CREATE INDEX "payload_locked_documents_rels_cms_programme_statistics_i_idx" ON "payload_locked_documents_rels" USING btree ("cms_programme_statistics_id");
  CREATE INDEX "payload_locked_documents_rels_cms_contact_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_contact_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_cms_newsletter_subscriptio_idx" ON "payload_locked_documents_rels" USING btree ("cms_newsletter_subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_cms_content_audit_entries__idx" ON "payload_locked_documents_rels" USING btree ("cms_content_audit_entries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_faqs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_eligibility_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_eligibility_content_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_programme_statistics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_programme_statistics_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_contact_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_newsletter_subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_content_audit_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_header_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_header_v_version_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_header_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_footer_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_homepage" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_homepage_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_contact_details" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_contact_details_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_site_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_site_settings_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_events" CASCADE;
  DROP TABLE "_cms_events_v" CASCADE;
  DROP TABLE "cms_faqs" CASCADE;
  DROP TABLE "_cms_faqs_v" CASCADE;
  DROP TABLE "cms_eligibility_content" CASCADE;
  DROP TABLE "_cms_eligibility_content_v" CASCADE;
  DROP TABLE "cms_programme_statistics" CASCADE;
  DROP TABLE "_cms_programme_statistics_v" CASCADE;
  DROP TABLE "cms_contact_submissions" CASCADE;
  DROP TABLE "cms_newsletter_subscriptions" CASCADE;
  DROP TABLE "cms_content_audit_entries" CASCADE;
  DROP TABLE "cms_header_navigation" CASCADE;
  DROP TABLE "cms_header" CASCADE;
  DROP TABLE "_cms_header_v_version_navigation" CASCADE;
  DROP TABLE "_cms_header_v" CASCADE;
  DROP TABLE "cms_footer" CASCADE;
  DROP TABLE "_cms_footer_v" CASCADE;
  DROP TABLE "cms_homepage" CASCADE;
  DROP TABLE "_cms_homepage_v" CASCADE;
  DROP TABLE "cms_contact_details" CASCADE;
  DROP TABLE "_cms_contact_details_v" CASCADE;
  DROP TABLE "cms_site_settings" CASCADE;
  DROP TABLE "_cms_site_settings_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_faqs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_eligibility_content_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_programme_statistics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletter_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_audit_entries_fk";
  
  DROP INDEX "cms_pages_review_status_idx";
  DROP INDEX "_cms_pages_v_version_version_review_status_idx";
  DROP INDEX "cms_news_review_status_idx";
  DROP INDEX "_cms_news_v_version_version_review_status_idx";
  DROP INDEX "cms_resources_slug_idx";
  DROP INDEX "cms_resources_review_status_idx";
  DROP INDEX "_cms_resources_v_version_version_slug_idx";
  DROP INDEX "_cms_resources_v_version_version_review_status_idx";
  DROP INDEX "cms_funding_calls_slug_idx";
  DROP INDEX "cms_funding_calls_review_status_idx";
  DROP INDEX "_cms_funding_calls_v_version_version_slug_idx";
  DROP INDEX "_cms_funding_calls_v_version_version_review_status_idx";
  DROP INDEX "payload_locked_documents_rels_cms_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_cms_faqs_id_idx";
  DROP INDEX "payload_locked_documents_rels_cms_eligibility_content_id_idx";
  DROP INDEX "payload_locked_documents_rels_cms_programme_statistics_i_idx";
  DROP INDEX "payload_locked_documents_rels_cms_contact_submissions_id_idx";
  DROP INDEX "payload_locked_documents_rels_cms_newsletter_subscriptio_idx";
  DROP INDEX "payload_locked_documents_rels_cms_content_audit_entries__idx";
  ALTER TABLE "cms_pages" DROP COLUMN "review_status";
  ALTER TABLE "cms_pages" DROP COLUMN "review_notes";
  ALTER TABLE "cms_pages" DROP COLUMN "exclude_from_search";
  ALTER TABLE "_cms_pages_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_pages_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "_cms_pages_v" DROP COLUMN "version_exclude_from_search";
  ALTER TABLE "cms_news" DROP COLUMN "review_status";
  ALTER TABLE "cms_news" DROP COLUMN "review_notes";
  ALTER TABLE "cms_news" DROP COLUMN "seo_title";
  ALTER TABLE "cms_news" DROP COLUMN "seo_description";
  ALTER TABLE "cms_news" DROP COLUMN "exclude_from_search";
  ALTER TABLE "_cms_news_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_news_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "_cms_news_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_cms_news_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_cms_news_v" DROP COLUMN "version_exclude_from_search";
  ALTER TABLE "cms_resources" DROP COLUMN "slug";
  ALTER TABLE "cms_resources" DROP COLUMN "published_at";
  ALTER TABLE "cms_resources" DROP COLUMN "review_status";
  ALTER TABLE "cms_resources" DROP COLUMN "review_notes";
  ALTER TABLE "cms_resources" DROP COLUMN "seo_title";
  ALTER TABLE "cms_resources" DROP COLUMN "seo_description";
  ALTER TABLE "cms_resources" DROP COLUMN "exclude_from_search";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_slug";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_published_at";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_cms_resources_v" DROP COLUMN "version_exclude_from_search";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "slug";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "call_status";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "minimum_amount";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "review_status";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "review_notes";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "seo_title";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "seo_description";
  ALTER TABLE "cms_funding_calls" DROP COLUMN "exclude_from_search";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_slug";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_call_status";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_minimum_amount";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_review_status";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_cms_funding_calls_v" DROP COLUMN "version_exclude_from_search";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_faqs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_eligibility_content_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_programme_statistics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_contact_submissions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_newsletter_subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_content_audit_entries_id";
  DROP TYPE "public"."enum_cms_pages_review_status";
  DROP TYPE "public"."enum__cms_pages_v_version_review_status";
  DROP TYPE "public"."enum_cms_news_review_status";
  DROP TYPE "public"."enum__cms_news_v_version_review_status";
  DROP TYPE "public"."enum_cms_resources_review_status";
  DROP TYPE "public"."enum__cms_resources_v_version_review_status";
  DROP TYPE "public"."enum_cms_events_review_status";
  DROP TYPE "public"."enum_cms_events_status";
  DROP TYPE "public"."enum__cms_events_v_version_review_status";
  DROP TYPE "public"."enum__cms_events_v_version_status";
  DROP TYPE "public"."enum_cms_faqs_review_status";
  DROP TYPE "public"."enum_cms_faqs_status";
  DROP TYPE "public"."enum__cms_faqs_v_version_review_status";
  DROP TYPE "public"."enum__cms_faqs_v_version_status";
  DROP TYPE "public"."enum_cms_funding_calls_call_status";
  DROP TYPE "public"."enum_cms_funding_calls_review_status";
  DROP TYPE "public"."enum__cms_funding_calls_v_version_call_status";
  DROP TYPE "public"."enum__cms_funding_calls_v_version_review_status";
  DROP TYPE "public"."enum_cms_eligibility_content_kind";
  DROP TYPE "public"."enum_cms_eligibility_content_review_status";
  DROP TYPE "public"."enum_cms_eligibility_content_status";
  DROP TYPE "public"."enum__cms_eligibility_content_v_version_kind";
  DROP TYPE "public"."enum__cms_eligibility_content_v_version_review_status";
  DROP TYPE "public"."enum__cms_eligibility_content_v_version_status";
  DROP TYPE "public"."enum_cms_programme_statistics_review_status";
  DROP TYPE "public"."enum_cms_programme_statistics_status";
  DROP TYPE "public"."enum__cms_programme_statistics_v_version_review_status";
  DROP TYPE "public"."enum__cms_programme_statistics_v_version_status";
  DROP TYPE "public"."enum_cms_contact_submissions_status";
  DROP TYPE "public"."enum_cms_newsletter_subscriptions_status";`)
}
