import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

import { migrateFundingOverviewDocuments } from "@/modules/content/infrastructure/PayloadFundingOverviewMigrationRepository";

export async function createFundingOverviewSectorTables(db: MigrateUpArgs["db"]): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cms_focus_sector_items" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL REFERENCES "cms_pages_blocks_eligibility_focus_sectors"("id") ON DELETE cascade,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar,
      "description" varchar
    );
    CREATE INDEX IF NOT EXISTS "cms_focus_sector_items_order_idx"
      ON "cms_focus_sector_items" ("_order");
    CREATE INDEX IF NOT EXISTS "cms_focus_sector_items_parent_id_idx"
      ON "cms_focus_sector_items" ("_parent_id");
    CREATE TABLE IF NOT EXISTS "_cms_focus_sector_items_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "_cms_pages_v_blocks_eligibility_focus_sectors"("id") ON DELETE cascade,
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar,
      "description" varchar,
      "_uuid" varchar
    );
    CREATE INDEX IF NOT EXISTS "_cms_focus_sector_items_v_order_idx"
      ON "_cms_focus_sector_items_v" ("_order");
    CREATE INDEX IF NOT EXISTS "_cms_focus_sector_items_v_parent_id_idx"
      ON "_cms_focus_sector_items_v" ("_parent_id");
  `);
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await createFundingOverviewSectorTables(db);
  await migrateFundingOverviewDocuments(payload, req);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Refuse a destructive rollback: these records may contain new editorial work.
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM "cms_pages"
        WHERE "slug" IN ('funding-support', 'funding-priority-applicants', 'funding-focus-sectors')
      ) THEN
        RAISE EXCEPTION 'Independent Overview content must be exported and reconciled before rollback';
      END IF;
    END $$;
    DROP TABLE IF EXISTS "_cms_focus_sector_items_v";
    DROP TABLE IF EXISTS "cms_focus_sector_items";
  `);
}
