import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { Client } from "pg";
import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { describe, expect, it } from "vitest";

import { down, up } from "@/payload/migrations/20261012_170000_news_autosave";

const connectionString = process.env.NEWS_AUTOSAVE_TEST_DATABASE_URL;

describe.skipIf(!connectionString)("News autosave migration on PostgreSQL", () => {
  it("preserves existing versions, supports repeated upgrades and rolls back", async () => {
    const client = new Client({ connectionString });
    await client.connect();
    const dialect = new PgDialect();
    const db = {
      execute: async (statement: SQL) => {
        const query = dialect.sqlToQuery(statement);
        return client.query(query.sql, query.params);
      },
    } as unknown as MigrateUpArgs["db"];

    try {
      await client.query("BEGIN");
      // A session-local table isolates this check from application data.
      await client.query(`
        CREATE TEMP TABLE "_cms_news_v" (
          id integer PRIMARY KEY,
          version_title varchar,
          version__status varchar
        );
        INSERT INTO "_cms_news_v" VALUES (1, 'Published article', 'published');
      `);
      await up({ db } as MigrateUpArgs);
      await up({ db } as MigrateUpArgs);
      expect((await client.query(`
        SELECT id, version_title, version__status, autosave FROM "_cms_news_v"
      `)).rows).toEqual([{
        id: 1,
        version_title: "Published article",
        version__status: "published",
        autosave: null,
      }]);
      await client.query(`
        INSERT INTO "_cms_news_v" VALUES (2, 'Incomplete draft', 'draft', true)
      `);
      await down({ db } as MigrateDownArgs);
      expect((await client.query(`
        SELECT id, version_title, version__status FROM "_cms_news_v" ORDER BY id
      `)).rows).toHaveLength(2);
      await up({ db } as MigrateUpArgs);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
