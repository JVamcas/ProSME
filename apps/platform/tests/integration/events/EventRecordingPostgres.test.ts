import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ database: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => fixture.database,
}));
import { readRecordingCategories } from "@/modules/content/infrastructure/EventRecordingRepository";
const connectionString = process.env.EVENT_REGISTRATION_TEST_DATABASE_URL;
describe.skipIf(!connectionString)(
  "Published recording category projection on PostgreSQL",
  () => {
    let pool: Pool;
    const schema = `recordings_${crypto.randomUUID().replaceAll("-", "")}`;
    beforeAll(async () => {
      pool = new Pool({
        connectionString,
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA ${schema}`);
      await pool.query(`CREATE TABLE cms_events(_status text, starts_at timestamptz, ends_at timestamptz, recording_url text, category text);
      INSERT INTO cms_events VALUES
        ('published',now()-interval '2 days',now()-interval '1 day','https://example.test/one','Funding'),
        ('published',now()-interval '2 days',NULL,'https://example.test/two','Funding'),
        ('published',now()-interval '2 days',NULL,'https://example.test/three','Applications'),
        ('draft',now()-interval '2 days',NULL,'https://example.test/private','Private'),
        ('published',now()+interval '2 days',NULL,'https://example.test/future','Future'),
        ('published',now()-interval '1 hour',now()+interval '1 hour','https://example.test/ongoing','Ongoing'),
        ('published',now()-interval '2 days',NULL,'','Empty'),
        ('published',now()-interval '2 days',NULL,NULL,'Absent');`);
      fixture.database = drizzle(pool);
    });
    afterAll(async () => {
      if (pool) {
        await pool.query(`DROP SCHEMA ${schema} CASCADE`);
        await pool.end();
      }
    });
    it("returns distinct sorted categories only from finished published recordings", async () => {
      expect(await readRecordingCategories()).toEqual([
        "Applications",
        "Funding",
      ]);
    });
  },
);
