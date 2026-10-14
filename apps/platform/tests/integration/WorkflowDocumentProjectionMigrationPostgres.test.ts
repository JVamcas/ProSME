import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import {
  workflowDocumentActors,
  workflowDocumentFileTypes,
} from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";

const enabled = process.env.RUN_WORKFLOW_DOCUMENT_MIGRATION_TESTS === "true";

(enabled ? describe : describe.skip)("workflow document projection migration", () => {
  it("preserves legacy rows, accepts supported settings, rejects invalid settings and reruns safely", async () => {
    const migration = await readFile(
      new URL(
        "../../drizzle/0208_workflow_document_projection_constraints.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL search_path = pg_temp");
      await client.query(`
        CREATE TEMP TABLE app_workflow_stage_document_requirements (
          id integer PRIMARY KEY,
          accepted_file_types jsonb NOT NULL,
          uploader text NOT NULL,
          CONSTRAINT app_stage_documents_file_types_check CHECK (
            jsonb_typeof(accepted_file_types) = 'array'
            AND jsonb_array_length(accepted_file_types) > 0
            AND accepted_file_types <@ '["PDF", "JPG", "PNG", "DOCX"]'::jsonb
          ),
          CONSTRAINT app_stage_documents_uploader_check CHECK (
            uploader IN ('APPLICANT', 'ASSIGNED_REVIEWER', 'STAFF')
          )
        ) ON COMMIT DROP;
        INSERT INTO app_workflow_stage_document_requirements
          VALUES (1, '["PDF", "DOCX", "JPG", "PNG"]', 'STAFF');
      `);
      const original = await client.query(
        "SELECT * FROM app_workflow_stage_document_requirements WHERE id = 1",
      );
      await client.query(migration);
      await client.query(migration);
      expect(
        (
          await client.query(
            "SELECT * FROM app_workflow_stage_document_requirements WHERE id = 1",
          )
        ).rows,
      ).toEqual(original.rows);

      const inserted = await client.query(
        `INSERT INTO app_workflow_stage_document_requirements
         SELECT 1 + row_number() OVER (), jsonb_build_array(file_type), uploader
         FROM unnest($1::text[]) AS file_type
         CROSS JOIN unnest($2::text[]) AS uploader`,
        [workflowDocumentFileTypes, workflowDocumentActors],
      );
      expect(inserted.rowCount).toBe(
        workflowDocumentFileTypes.length * workflowDocumentActors.length,
      );
      let id = 100;
      for (const [types, uploader] of [
        [[], "STAFF"],
        [["EXE"], "STAFF"],
        [["PDF", "EXE"], "STAFF"],
        ["PDF", "STAFF"],
        [["PDF"], "PUBLIC"],
      ]) {
        await client.query("SAVEPOINT invalid_setting");
        await expect(
          client.query(
            "INSERT INTO app_workflow_stage_document_requirements VALUES ($1, $2::jsonb, $3)",
            [id++, JSON.stringify(types), uploader],
          ),
        ).rejects.toMatchObject({ code: "23514" });
        await client.query("ROLLBACK TO SAVEPOINT invalid_setting");
      }
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  }, 60_000);
});
