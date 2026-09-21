import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "_cms_eligibility_content_v"
    WHERE "version_kind" = 'checkerQuestion';

    DELETE FROM "cms_eligibility_content"
    WHERE "kind" = 'checkerQuestion';

    ALTER TABLE "cms_eligibility_content"
      DROP COLUMN "key",
      DROP COLUMN "hard_stop",
      ALTER COLUMN "kind" TYPE text USING "kind"::text;

    ALTER TABLE "_cms_eligibility_content_v"
      DROP COLUMN "version_key",
      DROP COLUMN "version_hard_stop",
      ALTER COLUMN "version_kind" TYPE text USING "version_kind"::text;

    DROP TYPE "public"."enum_cms_eligibility_content_kind";
    DROP TYPE "public"."enum__cms_eligibility_content_v_version_kind";

    CREATE TYPE "public"."enum_cms_eligibility_content_kind"
      AS ENUM('criterion', 'focusSector');
    CREATE TYPE "public"."enum__cms_eligibility_content_v_version_kind"
      AS ENUM('criterion', 'focusSector');

    ALTER TABLE "cms_eligibility_content"
      ALTER COLUMN "kind" TYPE "public"."enum_cms_eligibility_content_kind"
      USING "kind"::"public"."enum_cms_eligibility_content_kind";

    ALTER TABLE "_cms_eligibility_content_v"
      ALTER COLUMN "version_kind"
      TYPE "public"."enum__cms_eligibility_content_v_version_kind"
      USING "version_kind"::"public"."enum__cms_eligibility_content_v_version_kind";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_cms_eligibility_content_kind"
      ADD VALUE 'checkerQuestion';
    ALTER TYPE "public"."enum__cms_eligibility_content_v_version_kind"
      ADD VALUE 'checkerQuestion';

    ALTER TABLE "cms_eligibility_content"
      ADD COLUMN "key" varchar,
      ADD COLUMN "hard_stop" boolean;

    ALTER TABLE "_cms_eligibility_content_v"
      ADD COLUMN "version_key" varchar,
      ADD COLUMN "version_hard_stop" boolean;
  `);
}
