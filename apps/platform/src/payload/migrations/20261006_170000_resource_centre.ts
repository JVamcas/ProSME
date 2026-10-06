import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_resources"
      ADD COLUMN IF NOT EXISTS "resource_name" varchar,
      ADD COLUMN IF NOT EXISTS "body" jsonb;
    ALTER TABLE "_cms_resources_v"
      ADD COLUMN IF NOT EXISTS "version_resource_name" varchar,
      ADD COLUMN IF NOT EXISTS "version_body" jsonb;
    UPDATE "cms_resources"
      SET "resource_name" = COALESCE(NULLIF("category", ''), "title")
      WHERE "resource_name" IS NULL;
    UPDATE "_cms_resources_v"
      SET "version_resource_name" = COALESCE(NULLIF("version_category", ''), "version_title")
      WHERE "version_resource_name" IS NULL;
    ALTER TABLE "cms_media"
      ADD COLUMN IF NOT EXISTS "document_thumbnail_id" integer;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cms_media_document_thumbnail_id_fk'
      ) THEN
        ALTER TABLE "cms_media"
          ADD CONSTRAINT "cms_media_document_thumbnail_id_fk"
          FOREIGN KEY ("document_thumbnail_id") REFERENCES "cms_media"("id")
          ON DELETE SET NULL;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS "cms_media_document_thumbnail_idx"
      ON "cms_media" ("document_thumbnail_id");
    CREATE INDEX IF NOT EXISTS "cms_resources_public_pagination_idx"
      ON "cms_resources" ("_status", "published_at" DESC, "created_at" DESC, "id" DESC);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "cms_resources_public_pagination_idx";
    DROP INDEX IF EXISTS "cms_media_document_thumbnail_idx";
    ALTER TABLE "cms_media" DROP COLUMN IF EXISTS "document_thumbnail_id";
    ALTER TABLE "_cms_resources_v"
      DROP COLUMN IF EXISTS "version_resource_name",
      DROP COLUMN IF EXISTS "version_body";
    ALTER TABLE "cms_resources"
      DROP COLUMN IF EXISTS "resource_name",
      DROP COLUMN IF EXISTS "body";
  `);
}
