import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { listForms } from "@/modules/forms/infrastructure/FormRepository";

const enabled = process.env.RUN_FORM_LIST_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let client: PoolClient;
const alpha = randomUUID();
const zulu = randomUUID();
const fallback = randomUUID();

beforeAll(async () => {
  if (!enabled) return;
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL search_path = pg_temp");
  await client.query(`
    CREATE TEMP TABLE app_form_definitions (
      id uuid PRIMARY KEY, code text, name text, description text,
      purpose text DEFAULT 'APPLICATION_REVIEW', active boolean DEFAULT true,
      updated_at timestamptz DEFAULT now()
    );
    CREATE TEMP TABLE app_form_versions (
      id uuid PRIMARY KEY, form_definition_id uuid, version_number integer,
      row_version integer DEFAULT 1, status text DEFAULT 'DRAFT', metadata jsonb
    );
    CREATE TEMP TABLE app_form_fields (form_version_id uuid);
    CREATE TEMP TABLE app_form_sections (form_version_id uuid);
    CREATE TEMP TABLE app_stage_task_form_bindings (form_version_id uuid);
  `);
  await client.query(
    `INSERT INTO app_form_definitions (id, code, name, description) VALUES
      ($1, 'OLD_ALPHA', 'Zulu stored name', ''),
      ($2, 'OLD_ZULU', 'Alpha stored name', ''),
      ($3, 'FALLBACK', 'Fallback form', 'No version yet')`,
    [alpha, zulu, fallback],
  );
  const alphaVersion = randomUUID();
  await client.query(
    `INSERT INTO app_form_versions
      (id, form_definition_id, version_number, metadata) VALUES
      ($1, $2, 1, $3::jsonb), ($4, $2, 2, $5::jsonb), ($6, $7, 1, $8::jsonb)`,
    [
      randomUUID(),
      alpha,
      JSON.stringify({
        code: "HISTORICAL",
        name: "Historical only",
        description: "",
      }),
      alphaVersion,
      JSON.stringify({
        code: "ALPHA_REVIEW",
        name: "Alpha Review",
        description: "Budget 50%_\\ literal",
      }),
      randomUUID(),
      zulu,
      JSON.stringify({
        code: "ZULU_REVIEW",
        name: "Zulu Review",
        description: "Eligibility checks",
      }),
    ],
  );
  await client.query(
    `WITH fields AS (INSERT INTO app_form_fields VALUES ($1), ($1))
     INSERT INTO app_form_sections VALUES ($1)`,
    [alphaVersion],
  );
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(client) as ReturnType<typeof getDatabase>,
  );
});

afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK");
    client.release();
  }
  await pool.end();
});

(enabled ? describe : describe.skip)("PostgreSQL form catalogue search", () => {
  it("filters before pagination and counts matches with the displayed-name ordering", async () => {
    const first = await listForms({ page: 1, pageSize: 1, search: "review" });
    const second = await listForms({ page: 2, pageSize: 1, search: "review" });
    const beyond = await listForms({ page: 3, pageSize: 1, search: "review" });
    expect(first.items.map((item) => item.id)).toEqual([alpha]);
    expect(second.items.map((item) => item.id)).toEqual([zulu]);
    expect(beyond.items).toEqual([]);
    expect(first.total).toBe(2);
    expect(second.totalPages).toBe(2);
    expect(first.items[0]).toMatchObject({
      name: "Alpha Review",
      fieldCount: 2,
      sectionCount: 1,
    });
  });

  it("searches latest codes and descriptions, falls back for unversioned forms, and treats wildcards literally", async () => {
    for (const search of ["alpha_review", "budget", "50%_\\", "%", "_\\"]) {
      const result = await listForms({ page: 1, pageSize: 10, search });
      expect(result.items.map((item) => item.id)).toEqual([alpha]);
      expect(result.total).toBe(1);
    }
    for (const search of ["HISTORICAL", "OLD_ALPHA", "no matching form"]) {
      const result = await listForms({ page: 1, pageSize: 10, search });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    }
    const result = await listForms({
      page: 1,
      pageSize: 10,
      search: "no version yet",
    });
    expect(result.items.map((item) => item.id)).toEqual([fallback]);
    expect(
      (await listForms({ page: 1, pageSize: 10, search: "  " })).total,
    ).toBe(3);
  });
});
