import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ database: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: () => fixture.database }));

import { readEventRegistrationAvailability } from "@/modules/content/infrastructure/EventRegistrationAvailabilityRepository";

const connectionString = process.env.EVENT_REGISTRATION_TEST_DATABASE_URL;

describe.skipIf(!connectionString)("public registration availability projection", () => {
  let pool: Pool;
  let schemaCreated = false;
  const schema = `event_availability_${crypto.randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await pool.query(`
      CREATE TABLE cms_events (id integer PRIMARY KEY, starts_at timestamptz, _status text);
      CREATE TABLE app_event_registration_settings (
        event_id integer PRIMARY KEY, enabled boolean, opens_at timestamptz, closes_at timestamptz
      );
      INSERT INTO cms_events VALUES
        (1, '2030-11-12T08:00:00Z', 'published'),
        (2, '2030-11-12T08:00:00Z', 'published'),
        (3, '2030-11-12T08:00:00Z', 'draft');
      INSERT INTO app_event_registration_settings VALUES
        (1, true, '2030-11-10T08:00:00Z', '2030-11-12T07:00:00Z'),
        (3, true, NULL, NULL);
    `);
    fixture.database = drizzle(pool);
  });

  afterAll(async () => {
    if (pool) {
      try {
        if (schemaCreated) {
          await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
        }
      } finally {
        await pool.end();
      }
    }
  });

  it("projects only requested events and preserves missing settings", async () => {
    const rows = await readEventRegistrationAvailability([1, 2]);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === 1)).toMatchObject({ enabled: true, published: true });
    expect(rows.find((row) => row.id === 2)).toMatchObject({ enabled: null, opensAt: null, closesAt: null });
    expect(Object.keys(rows[0]).sort()).toEqual([
      "closesAt", "enabled", "id", "opensAt", "published", "startsAt",
    ]);
  });

  it("keeps draft publication state in the projection", async () => {
    expect(await readEventRegistrationAvailability([3])).toMatchObject([{ id: 3, published: false }]);
  });

  it("returns no events for an empty page", async () => {
    expect(await readEventRegistrationAvailability([])).toEqual([]);
  });
});
