import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { describe, expect, it } from "vitest";

const testUrl = process.env.WORKFLOW_TERMINAL_MIGRATION_TEST_URL;
const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0152_workflow_terminal_applicant_status.sql",
  ),
  "utf8",
);

describe.skipIf(!testUrl)("terminal applicant wording migration", () => {
  it("preserves legacy routes and custom wording on repeat execution", async () => {
    const client = new pg.Client({ connectionString: testUrl });
    const schema = `terminal_test_${crypto.randomUUID().replaceAll("-", "")}`;
    await client.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(`
        CREATE TABLE app_workflow_transition_definitions (
          id integer PRIMARY KEY,
          terminal_outcome text
        );
        INSERT INTO app_workflow_transition_definitions VALUES (1, 'RECOVERY');
      `);
      await client.query(migration);
      expect(
        (
          await client.query(
            "SELECT * FROM app_workflow_transition_definitions",
          )
        ).rows,
      ).toEqual([
        {
          id: 1,
          terminal_outcome: "RECOVERY",
          terminal_applicant_status: null,
        },
      ]);
      const wording = {
        label: "Recovery review",
        description: "Please review the decision.",
      };
      await client.query(
        "UPDATE app_workflow_transition_definitions SET terminal_applicant_status = $1::jsonb WHERE id = 1",
        [JSON.stringify(wording)],
      );
      await client.query(migration);
      expect(
        (
          await client.query(
            "SELECT terminal_applicant_status FROM app_workflow_transition_definitions",
          )
        ).rows[0].terminal_applicant_status,
      ).toEqual(wording);
    } finally {
      await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      await client.end();
    }
  });
});
