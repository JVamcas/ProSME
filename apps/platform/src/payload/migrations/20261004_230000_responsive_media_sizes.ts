import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from "@payloadcms/db-postgres";

const variants = ["thumbnail", "mobile", "tablet", "desktop"] as const;
const fields = [
  ["url", "varchar"],
  ["width", "numeric"],
  ["height", "numeric"],
  ["mime_type", "varchar"],
  ["filesize", "numeric"],
  ["filename", "varchar"],
] as const;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const columns = variants.flatMap((variant) =>
    fields.map(
      ([field, type]) =>
        `ADD COLUMN IF NOT EXISTS "sizes_${variant}_${field}" ${type}`,
    ),
  );
  const indexes = variants.map(
    (variant) =>
      `CREATE INDEX IF NOT EXISTS "cms_media_sizes_${variant}_sizes_${variant}_filename_idx" ON "cms_media" ("sizes_${variant}_filename");`,
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "cms_media" ${columns.join(",\n")};\n${indexes.join("\n")}`,
    ),
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const columns = variants.flatMap((variant) =>
    fields.map(
      ([field]) => `DROP COLUMN IF EXISTS "sizes_${variant}_${field}"`,
    ),
  );

  await db.execute(sql.raw(`ALTER TABLE "cms_media" ${columns.join(",\n")};`));
}
