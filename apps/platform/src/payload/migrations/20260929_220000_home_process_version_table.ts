import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_pages_blocks_statistics"
      ADD COLUMN IF NOT EXISTS "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';
    ALTER TABLE "_cms_pages_v_blocks_statistics"
      ADD COLUMN IF NOT EXISTS "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';
    DO $$
    BEGIN
      IF to_regclass('public._cms_homepage_v_process_steps') IS NOT NULL
        AND to_regclass('public._cms_homepage_v_version_process_steps') IS NULL THEN
        ALTER TABLE "_cms_homepage_v_process_steps"
          RENAME TO "_cms_homepage_v_version_process_steps";
        ALTER INDEX "_cms_homepage_v_process_steps_order_idx"
          RENAME TO "_cms_homepage_v_version_process_steps_order_idx";
        ALTER INDEX "_cms_homepage_v_process_steps_parent_id_idx"
          RENAME TO "_cms_homepage_v_version_process_steps_parent_id_idx";
      END IF;
    END
    $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Keep the final table name so the preceding migration can reverse cleanly.
  await db.execute(sql`SELECT 1;`);
}
