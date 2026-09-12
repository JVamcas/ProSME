import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_header_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_header_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_footer_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_footer_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_homepage_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_homepage_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_contact_details_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_contact_details_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_site_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_site_settings_v_version_status" AS ENUM('draft', 'published');
  ALTER TABLE "cms_header_navigation" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "cms_header_navigation" ALTER COLUMN "href" DROP NOT NULL;
  ALTER TABLE "_cms_header_v_version_navigation" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "_cms_header_v_version_navigation" ALTER COLUMN "href" DROP NOT NULL;
  ALTER TABLE "cms_contact_details" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "cms_contact_details" ALTER COLUMN "address" DROP NOT NULL;
  ALTER TABLE "_cms_contact_details_v" ALTER COLUMN "version_email" DROP NOT NULL;
  ALTER TABLE "_cms_contact_details_v" ALTER COLUMN "version_address" DROP NOT NULL;
  ALTER TABLE "cms_site_settings" ALTER COLUMN "site_name" DROP NOT NULL;
  ALTER TABLE "cms_site_settings" ALTER COLUMN "site_description" DROP NOT NULL;
  ALTER TABLE "_cms_site_settings_v" ALTER COLUMN "version_site_name" DROP NOT NULL;
  ALTER TABLE "_cms_site_settings_v" ALTER COLUMN "version_site_description" DROP NOT NULL;
  ALTER TABLE "cms_header" ADD COLUMN "_status" "enum_cms_header_status" DEFAULT 'draft';
  ALTER TABLE "_cms_header_v" ADD COLUMN "version__status" "enum__cms_header_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_cms_header_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "cms_footer" ADD COLUMN "_status" "enum_cms_footer_status" DEFAULT 'draft';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "version__status" "enum__cms_footer_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_cms_footer_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "cms_homepage" ADD COLUMN "_status" "enum_cms_homepage_status" DEFAULT 'draft';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "version__status" "enum__cms_homepage_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_cms_homepage_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "cms_contact_details" ADD COLUMN "_status" "enum_cms_contact_details_status" DEFAULT 'draft';
  ALTER TABLE "_cms_contact_details_v" ADD COLUMN "version__status" "enum__cms_contact_details_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_cms_contact_details_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "cms_site_settings" ADD COLUMN "_status" "enum_cms_site_settings_status" DEFAULT 'draft';
  ALTER TABLE "_cms_site_settings_v" ADD COLUMN "version__status" "enum__cms_site_settings_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_cms_site_settings_v" ADD COLUMN "latest" boolean;
  CREATE INDEX "cms_header__status_idx" ON "cms_header" USING btree ("_status");
  CREATE INDEX "_cms_header_v_version_version__status_idx" ON "_cms_header_v" USING btree ("version__status");
  CREATE INDEX "_cms_header_v_latest_idx" ON "_cms_header_v" USING btree ("latest");
  CREATE INDEX "cms_footer__status_idx" ON "cms_footer" USING btree ("_status");
  CREATE INDEX "_cms_footer_v_version_version__status_idx" ON "_cms_footer_v" USING btree ("version__status");
  CREATE INDEX "_cms_footer_v_latest_idx" ON "_cms_footer_v" USING btree ("latest");
  CREATE INDEX "cms_homepage__status_idx" ON "cms_homepage" USING btree ("_status");
  CREATE INDEX "_cms_homepage_v_version_version__status_idx" ON "_cms_homepage_v" USING btree ("version__status");
  CREATE INDEX "_cms_homepage_v_latest_idx" ON "_cms_homepage_v" USING btree ("latest");
  CREATE INDEX "cms_contact_details__status_idx" ON "cms_contact_details" USING btree ("_status");
  CREATE INDEX "_cms_contact_details_v_version_version__status_idx" ON "_cms_contact_details_v" USING btree ("version__status");
  CREATE INDEX "_cms_contact_details_v_latest_idx" ON "_cms_contact_details_v" USING btree ("latest");
  CREATE INDEX "cms_site_settings__status_idx" ON "cms_site_settings" USING btree ("_status");
  CREATE INDEX "_cms_site_settings_v_version_version__status_idx" ON "_cms_site_settings_v" USING btree ("version__status");
  CREATE INDEX "_cms_site_settings_v_latest_idx" ON "_cms_site_settings_v" USING btree ("latest");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_header__status_idx";
  DROP INDEX "_cms_header_v_version_version__status_idx";
  DROP INDEX "_cms_header_v_latest_idx";
  DROP INDEX "cms_footer__status_idx";
  DROP INDEX "_cms_footer_v_version_version__status_idx";
  DROP INDEX "_cms_footer_v_latest_idx";
  DROP INDEX "cms_homepage__status_idx";
  DROP INDEX "_cms_homepage_v_version_version__status_idx";
  DROP INDEX "_cms_homepage_v_latest_idx";
  DROP INDEX "cms_contact_details__status_idx";
  DROP INDEX "_cms_contact_details_v_version_version__status_idx";
  DROP INDEX "_cms_contact_details_v_latest_idx";
  DROP INDEX "cms_site_settings__status_idx";
  DROP INDEX "_cms_site_settings_v_version_version__status_idx";
  DROP INDEX "_cms_site_settings_v_latest_idx";
  ALTER TABLE "cms_header_navigation" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "cms_header_navigation" ALTER COLUMN "href" SET NOT NULL;
  ALTER TABLE "_cms_header_v_version_navigation" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "_cms_header_v_version_navigation" ALTER COLUMN "href" SET NOT NULL;
  ALTER TABLE "cms_contact_details" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "cms_contact_details" ALTER COLUMN "address" SET NOT NULL;
  ALTER TABLE "_cms_contact_details_v" ALTER COLUMN "version_email" SET NOT NULL;
  ALTER TABLE "_cms_contact_details_v" ALTER COLUMN "version_address" SET NOT NULL;
  ALTER TABLE "cms_site_settings" ALTER COLUMN "site_name" SET NOT NULL;
  ALTER TABLE "cms_site_settings" ALTER COLUMN "site_description" SET NOT NULL;
  ALTER TABLE "_cms_site_settings_v" ALTER COLUMN "version_site_name" SET NOT NULL;
  ALTER TABLE "_cms_site_settings_v" ALTER COLUMN "version_site_description" SET NOT NULL;
  ALTER TABLE "cms_header" DROP COLUMN "_status";
  ALTER TABLE "_cms_header_v" DROP COLUMN "version__status";
  ALTER TABLE "_cms_header_v" DROP COLUMN "latest";
  ALTER TABLE "cms_footer" DROP COLUMN "_status";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "version__status";
  ALTER TABLE "_cms_footer_v" DROP COLUMN "latest";
  ALTER TABLE "cms_homepage" DROP COLUMN "_status";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "version__status";
  ALTER TABLE "_cms_homepage_v" DROP COLUMN "latest";
  ALTER TABLE "cms_contact_details" DROP COLUMN "_status";
  ALTER TABLE "_cms_contact_details_v" DROP COLUMN "version__status";
  ALTER TABLE "_cms_contact_details_v" DROP COLUMN "latest";
  ALTER TABLE "cms_site_settings" DROP COLUMN "_status";
  ALTER TABLE "_cms_site_settings_v" DROP COLUMN "version__status";
  ALTER TABLE "_cms_site_settings_v" DROP COLUMN "latest";
  DROP TYPE "public"."enum_cms_header_status";
  DROP TYPE "public"."enum__cms_header_v_version_status";
  DROP TYPE "public"."enum_cms_footer_status";
  DROP TYPE "public"."enum__cms_footer_v_version_status";
  DROP TYPE "public"."enum_cms_homepage_status";
  DROP TYPE "public"."enum__cms_homepage_v_version_status";
  DROP TYPE "public"."enum_cms_contact_details_status";
  DROP TYPE "public"."enum__cms_contact_details_v_version_status";
  DROP TYPE "public"."enum_cms_site_settings_status";
  DROP TYPE "public"."enum__cms_site_settings_v_version_status";`)
}
