import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { workflowDocumentEvidenceIsCurrent } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceReadiness";

const enabled = process.env.RUN_WORKFLOW_TASK_SCOPE_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    })
  : null;
const dialect = new PgDialect();
const ids = {
  stage: randomUUID(),
  laterRun: randomUUID(),
  firstDefinition: randomUUID(),
  secondDefinition: randomUUID(),
  firstReviewer: randomUUID(),
  secondReviewer: randomUUID(),
  otherTask: randomUUID(),
  laterTask: randomUUID(),
  requirement: randomUUID(),
  original: randomUUID(),
  replacement: randomUUID(),
};

async function query(text: string, params: unknown[] = []) {
  if (!client) throw new Error("Task scope database tests are disabled.");
  return client.query(text, params);
}

beforeAll(async () => {
  await client?.connect();
});
afterAll(async () => {
  await client?.end();
});
afterEach(async () => {
  if (client) await query("ROLLBACK");
});
beforeEach(async () => {
  if (!client) return;
  await query("BEGIN");
  await query("SET LOCAL search_path TO pg_temp, public");
  // Temporary tables shadow application tables; all writes are rolled back.
  await query(`
    CREATE TEMP TABLE app_workflow_stage_scoring_configurations (
      stage_id uuid PRIMARY KEY, task_definition_id uuid NOT NULL, aggregation text
    ) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_stage_scoring_criteria (
      id uuid PRIMARY KEY, stage_id uuid NOT NULL, stable_key text, criterion text,
      CONSTRAINT app_stage_scoring_criterion_configuration_fk
        FOREIGN KEY (stage_id) REFERENCES app_workflow_stage_scoring_configurations(stage_id)
    ) ON COMMIT DROP;
    ALTER TABLE app_workflow_stage_scoring_criteria ADD CONSTRAINT app_stage_scoring_criteria_key_unique UNIQUE(stage_id, stable_key);
    CREATE UNIQUE INDEX app_stage_scoring_criteria_name_unique ON app_workflow_stage_scoring_criteria(stage_id, criterion);
    CREATE TEMP TABLE app_workflow_stage_checklist_definitions (
      stage_id uuid, task_definition_id uuid, key text, display_order integer
    ) ON COMMIT DROP;
    CREATE UNIQUE INDEX app_stage_checklists_stage_key_unique ON app_workflow_stage_checklist_definitions(stage_id, key);
    CREATE UNIQUE INDEX app_stage_checklists_stage_order_unique ON app_workflow_stage_checklist_definitions(stage_id, display_order);
    CREATE TEMP TABLE app_workflow_stage_comment_fields (
      stage_id uuid, task_definition_id uuid, key text, display_order integer
    ) ON COMMIT DROP;
    CREATE UNIQUE INDEX app_stage_comments_stage_key_unique ON app_workflow_stage_comment_fields(stage_id, key);
    CREATE UNIQUE INDEX app_stage_comments_stage_order_unique ON app_workflow_stage_comment_fields(stage_id, display_order);
    CREATE TEMP TABLE app_workflow_stage_document_requirements (
      stage_id uuid, task_definition_id uuid, stable_key text, name text
    ) ON COMMIT DROP;
    ALTER TABLE app_workflow_stage_document_requirements ADD CONSTRAINT app_stage_documents_stage_key_unique UNIQUE(stage_id, stable_key);
    CREATE UNIQUE INDEX app_stage_documents_stage_name_unique ON app_workflow_stage_document_requirements(stage_id, name);
    CREATE TEMP TABLE app_workflow_tasks (
      id uuid PRIMARY KEY, stage_instance_id uuid, workflow_task_definition_id uuid
    ) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_document_evidence_versions (
      id uuid PRIMARY KEY, requirement_id uuid, version_number integer
    ) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_task_document_evidence (
      task_id uuid, document_version_id uuid, PRIMARY KEY(task_id, document_version_id)
    ) ON COMMIT DROP;
  `);
});

async function currentVersions(taskId: string) {
  const compiled = dialect.sqlToQuery(sql`
    SELECT evidence.id FROM app_workflow_document_evidence_versions evidence
    WHERE ${workflowDocumentEvidenceIsCurrent(sql`${taskId}::uuid`)}
    ORDER BY evidence.version_number
  `);
  return (await query(compiled.sql, compiled.params)).rows.map((row) => row.id);
}

(enabled ? describe : describe.skip)(
  "workflow task submission scope in PostgreSQL",
  () => {
    it("migrates existing scoring ownership and permits independent task configurations", async () => {
      await query(
        "INSERT INTO app_workflow_stage_scoring_configurations VALUES ($1, $2, 'AVERAGE')",
        [ids.stage, ids.firstDefinition],
      );
      await query(
        "INSERT INTO app_workflow_stage_scoring_criteria VALUES ($1, $2, 'VIABILITY', 'Viability')",
        [randomUUID(), ids.stage],
      );
      const migration = await readFile(
        new URL(
          "../../drizzle/0163_workflow_task_submission_scope.sql",
          import.meta.url,
        ),
        "utf8",
      );
      for (const statement of migration.split("--> statement-breakpoint"))
        await query(statement);
      const existing = await query(
        "SELECT task_definition_id FROM app_workflow_stage_scoring_criteria",
      );
      expect(existing.rows[0].task_definition_id).toBe(ids.firstDefinition);
      await query(
        "INSERT INTO app_workflow_stage_scoring_configurations VALUES ($1, $2, 'SUM')",
        [ids.stage, ids.secondDefinition],
      );
      await query(
        "INSERT INTO app_workflow_stage_scoring_criteria VALUES ($1, $2, 'VIABILITY', 'Viability', $3)",
        [randomUUID(), ids.stage, ids.secondDefinition],
      );
      expect(
        (
          await query(
            "SELECT count(*)::int AS count FROM app_workflow_stage_scoring_criteria",
          )
        ).rows[0].count,
      ).toBe(2);
      for (const definition of [ids.firstDefinition, ids.secondDefinition]) {
        await query(
          "INSERT INTO app_workflow_stage_checklist_definitions VALUES ($1, $2, 'VERIFIED', 1)",
          [ids.stage, definition],
        );
        await query(
          "INSERT INTO app_workflow_stage_comment_fields VALUES ($1, $2, 'RECOMMENDATION', 1)",
          [ids.stage, definition],
        );
        await query(
          "INSERT INTO app_workflow_stage_document_requirements VALUES ($1, $2, 'EVIDENCE', 'Evidence')",
          [ids.stage, definition],
        );
      }
      await query("SAVEPOINT duplicate_check");
      await expect(
        query(
          "INSERT INTO app_workflow_stage_checklist_definitions VALUES ($1, $2, 'VERIFIED', 1)",
          [ids.stage, ids.firstDefinition],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      await query("ROLLBACK TO SAVEPOINT duplicate_check");
      await expect(
        query(
          "INSERT INTO app_workflow_stage_scoring_criteria VALUES ($1, $2, 'OTHER', 'Other', $3)",
          [randomUUID(), ids.laterRun, ids.firstDefinition],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    });

    it("shares the latest upload across reviewers while preserving history and run isolation", async () => {
      for (const [taskId, stage, definition] of [
        [ids.firstReviewer, ids.stage, ids.firstDefinition],
        [ids.secondReviewer, ids.stage, ids.firstDefinition],
        [ids.otherTask, ids.stage, ids.secondDefinition],
        [ids.laterTask, ids.laterRun, ids.firstDefinition],
      ]) {
        await query("INSERT INTO app_workflow_tasks VALUES ($1, $2, $3)", [
          taskId,
          stage,
          definition,
        ]);
      }
      await query(
        "INSERT INTO app_workflow_document_evidence_versions VALUES ($1, $2, 1)",
        [ids.original, ids.requirement],
      );
      await query(
        "INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)",
        [ids.firstReviewer, ids.original],
      );
      expect(await currentVersions(ids.secondReviewer)).toEqual([ids.original]);
      expect(await currentVersions(ids.otherTask)).toEqual([]);
      expect(await currentVersions(ids.laterTask)).toEqual([]);
      await query(
        "INSERT INTO app_workflow_document_evidence_versions VALUES ($1, $2, 2)",
        [ids.replacement, ids.requirement],
      );
      await query(
        "INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)",
        [ids.secondReviewer, ids.replacement],
      );
      expect(await currentVersions(ids.firstReviewer)).toEqual([
        ids.replacement,
      ]);
      expect(await currentVersions(ids.secondReviewer)).toEqual([
        ids.replacement,
      ]);
      expect(
        (
          await query(
            "SELECT count(*)::int AS count FROM app_workflow_document_evidence_versions",
          )
        ).rows[0].count,
      ).toBe(2);
      // Explicit Retain may link the selected version into the returned run.
      await query(
        "INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)",
        [ids.laterTask, ids.replacement],
      );
      expect(await currentVersions(ids.laterTask)).toEqual([ids.replacement]);
      const newer = randomUUID();
      await query(
        "INSERT INTO app_workflow_document_evidence_versions VALUES ($1, $2, 3)",
        [newer, ids.requirement],
      );
      await query(
        "INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)",
        [ids.firstReviewer, newer],
      );
      expect(await currentVersions(ids.firstReviewer)).toEqual([newer]);
      expect(await currentVersions(ids.laterTask)).toEqual([ids.replacement]);
    });
  },
);
