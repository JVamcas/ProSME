import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "cms_header_navigation" CASCADE;
    DROP TABLE "_cms_header_v_version_navigation" CASCADE;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "cms_header_navigation" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "href" varchar NOT NULL
    );

    CREATE TABLE "_cms_header_v_version_navigation" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "href" varchar NOT NULL,
      "_uuid" varchar
    );

    ALTER TABLE "cms_header_navigation"
      ADD CONSTRAINT "cms_header_navigation_parent_id_fk"
      FOREIGN KEY ("_parent_id")
      REFERENCES "public"."cms_header"("id")
      ON DELETE cascade
      ON UPDATE no action;

    ALTER TABLE "_cms_header_v_version_navigation"
      ADD CONSTRAINT "_cms_header_v_version_navigation_parent_id_fk"
      FOREIGN KEY ("_parent_id")
      REFERENCES "public"."_cms_header_v"("id")
      ON DELETE cascade
      ON UPDATE no action;

    CREATE INDEX "cms_header_navigation_order_idx"
      ON "cms_header_navigation" USING btree ("_order");
    CREATE INDEX "cms_header_navigation_parent_id_idx"
      ON "cms_header_navigation" USING btree ("_parent_id");
    CREATE INDEX "_cms_header_v_version_navigation_order_idx"
      ON "_cms_header_v_version_navigation" USING btree ("_order");
    CREATE INDEX "_cms_header_v_version_navigation_parent_id_idx"
      ON "_cms_header_v_version_navigation" USING btree ("_parent_id");
  `);
}
