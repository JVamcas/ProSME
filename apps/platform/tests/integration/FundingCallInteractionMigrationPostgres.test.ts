import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.FUNDING_VERSION_READ_TEST_DATABASE_URL;
const schema = `interaction_migration_${randomUUID().replaceAll("-", "")}`;

describe.skipIf(!url)(
  "public interaction migration on disposable PostgreSQL",
  () => {
    let pool: pg.Pool;
    let migration: string;
    const callId = randomUUID();
    const controllerRole = randomUUID();
    const editorRole = randomUUID();

    beforeAll(async () => {
      pool = new pg.Pool({
        connectionString: url,
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA ${schema}`);
      await pool.query(`
      CREATE TABLE app_funding_calls(id uuid PRIMARY KEY);
      CREATE TABLE app_capabilities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE, description text);
      CREATE TABLE app_role_capabilities(role_id uuid, capability_id uuid, PRIMARY KEY(role_id, capability_id));
      INSERT INTO app_capabilities(code) VALUES ('funding.call.suspend'), ('funding.call.resume'), ('funding.call.edit-draft');
    `);
      await pool.query("INSERT INTO app_funding_calls VALUES ($1)", [callId]);
      await pool.query(
        "INSERT INTO app_role_capabilities SELECT $1, id FROM app_capabilities WHERE code IN ('funding.call.suspend', 'funding.call.resume')",
        [controllerRole],
      );
      await pool.query(
        "INSERT INTO app_role_capabilities SELECT $1, id FROM app_capabilities WHERE code = 'funding.call.edit-draft'",
        [editorRole],
      );
      migration = await readFile(
        new URL(
          "../../drizzle/0198_funding_call_public_interaction.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await pool.query(migration);
    });

    afterAll(async () => {
      if (pool) {
        await pool.query(`DROP SCHEMA ${schema} CASCADE`);
        await pool.end();
      }
    });

    it("defaults existing calls to enabled and preserves disabled settings on repetition", async () => {
      expect(
        (
          await pool.query(
            "SELECT public_interaction_enabled FROM app_funding_calls WHERE id = $1",
            [callId],
          )
        ).rows[0],
      ).toEqual({ public_interaction_enabled: true });
      await pool.query(
        "UPDATE app_funding_calls SET public_interaction_enabled = false WHERE id = $1",
        [callId],
      );
      await pool.query(migration);
      expect(
        (
          await pool.query(
            "SELECT public_interaction_enabled FROM app_funding_calls WHERE id = $1",
            [callId],
          )
        ).rows[0],
      ).toEqual({ public_interaction_enabled: false });
    });

    it("creates explicit enable/disable grants only for roles with matching intake-control authority", async () => {
      const grants = await pool.query(`
      SELECT r.role_id, c.code FROM app_role_capabilities r
      JOIN app_capabilities c ON c.id = r.capability_id
      WHERE c.code LIKE 'funding.call.public-interaction.%' ORDER BY c.code
    `);
      expect(grants.rows).toEqual([
        {
          role_id: controllerRole,
          code: "funding.call.public-interaction.disable.all",
        },
        {
          role_id: controllerRole,
          code: "funding.call.public-interaction.enable.all",
        },
      ]);
    });
  },
);
