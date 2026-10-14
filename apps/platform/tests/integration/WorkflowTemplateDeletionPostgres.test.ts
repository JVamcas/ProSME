import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/platform/database/client";
import { deleteWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateDeletionRepository";
import {
  listWorkflowTemplatePage,
  listWorkflowTemplateVersionPage,
} from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";

const enabled = process.env.RUN_WORKFLOW_DELETION_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let client: PoolClient;
const templateId = randomUUID();
const first = randomUUID();
const latest = randomUUID();
const stage = randomUUID();
const task = randomUUID();
const actorId = randomUUID();
const input = {
  definitionId: templateId,
  versionId: latest,
  expectedRowVersion: 7,
  actorId,
  correlationId: randomUUID(),
};
const stageChildren = [
  "app_stage_task_action_bindings",
  "app_workflow_stage_comment_fields",
  "app_workflow_stage_scoring_criteria",
  "app_workflow_stage_scoring_configurations",
  "app_workflow_stage_checklist_definitions",
  "app_workflow_stage_document_requirements",
  "app_workflow_action_definitions",
];

beforeAll(async () => {
  if (!enabled) return;
  client = await pool.connect();
  await client.query("SET search_path = pg_temp");
  await client.query(`
    CREATE TEMP TABLE app_workflow_definitions (
      id uuid PRIMARY KEY, code text DEFAULT 'DRAFT_TEMPLATE', name text DEFAULT 'Draft template',
      description text DEFAULT '', active boolean DEFAULT true, updated_at timestamptz DEFAULT now()
    );
    CREATE TEMP TABLE app_workflow_definition_versions (
      id uuid PRIMARY KEY, definition_id uuid REFERENCES app_workflow_definitions,
      version_number integer, row_version integer, status text,
      metadata jsonb DEFAULT '{}', updated_at timestamptz DEFAULT now(),
      source_version_id uuid REFERENCES app_workflow_definition_versions ON DELETE RESTRICT
    );
    CREATE TEMP TABLE app_workflow_stage_definitions (
      id uuid PRIMARY KEY, version_id uuid REFERENCES app_workflow_definition_versions
    );
    CREATE TEMP TABLE app_stage_task_definitions (
      id uuid PRIMARY KEY, stage_id uuid REFERENCES app_workflow_stage_definitions
    );
    CREATE TEMP TABLE app_form_versions (id uuid PRIMARY KEY);
    CREATE TEMP TABLE app_stage_task_form_bindings (
      task_definition_id uuid REFERENCES app_stage_task_definitions,
      form_version_id uuid REFERENCES app_form_versions
    );
    CREATE TEMP TABLE app_workflow_transition_definitions (
      id uuid PRIMARY KEY, version_id uuid REFERENCES app_workflow_definition_versions
    );
    CREATE TEMP TABLE app_workflow_transition_targets (
      transition_id uuid REFERENCES app_workflow_transition_definitions,
      target_stage_id uuid REFERENCES app_workflow_stage_definitions
    );
    CREATE TEMP TABLE app_workflow_stage_join_predecessors (
      stage_id uuid REFERENCES app_workflow_stage_definitions,
      predecessor_stage_id uuid REFERENCES app_workflow_stage_definitions
    );
    CREATE TEMP TABLE app_workflow_form_migrations (
      source_version_id uuid REFERENCES app_workflow_definition_versions,
      target_version_id uuid REFERENCES app_workflow_definition_versions, mapping jsonb
    );
    CREATE TEMP TABLE app_workflow_audit_entries (
      runtime_sequence bigint GENERATED ALWAYS AS IDENTITY,
      id uuid DEFAULT gen_random_uuid(), actor_id uuid, action text,
      target_type text, target_id text, correlation_id uuid, idempotency_key text,
      workflow_instance_id uuid, stage_instance_id uuid, task_id uuid,
      reason text, before jsonb, after jsonb, created_at timestamptz DEFAULT now()
    );
    CREATE TEMP TABLE deletion_external_reference (
      version_id uuid REFERENCES app_workflow_definition_versions
    );
    CREATE TEMP TABLE app_capabilities (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, code text UNIQUE, description text
    );
    CREATE TEMP TABLE app_role_capabilities (
      role_id uuid, capability_id integer REFERENCES app_capabilities,
      PRIMARY KEY (role_id, capability_id)
    );
  `);
  for (const table of stageChildren) {
    await client.query(
      `CREATE TEMP TABLE ${table} (stage_id uuid REFERENCES app_workflow_stage_definitions)`,
    );
  }
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(client) as ReturnType<typeof getDatabase>,
  );
});

beforeEach(async () => {
  if (!enabled) return;
  await client.query(
    "TRUNCATE app_workflow_definitions, app_form_versions, app_workflow_audit_entries CASCADE",
  );
  await client.query("INSERT INTO app_workflow_definitions(id) VALUES ($1)", [
    templateId,
  ]);
  await client.query(
    `INSERT INTO app_workflow_definition_versions(id, definition_id, version_number, row_version, status, source_version_id) VALUES
    ($1, $2, 1, 1, 'DRAFT', NULL), ($3, $2, 2, 7, 'DRAFT', $1)`,
    [first, templateId, latest],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_definitions VALUES ($1, $2)",
    [stage, latest],
  );
  await client.query("INSERT INTO app_stage_task_definitions VALUES ($1, $2)", [
    task,
    stage,
  ]);
  await client.query("INSERT INTO app_form_versions VALUES ($1)", [latest]);
  await client.query(
    "INSERT INTO app_stage_task_form_bindings VALUES ($1, $2)",
    [task, latest],
  );
  await client.query(
    "INSERT INTO app_workflow_transition_definitions VALUES ($1, $2)",
    [latest, latest],
  );
  await client.query(
    "INSERT INTO app_workflow_transition_targets VALUES ($1, $2)",
    [latest, stage],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_join_predecessors VALUES ($1, $1)",
    [stage],
  );
  await client.query(
    "INSERT INTO app_workflow_form_migrations VALUES ($1, $2, '[]')",
    [first, latest],
  );
  for (const table of stageChildren)
    await client.query(`INSERT INTO ${table} VALUES ($1)`, [stage]);
});

afterAll(async () => {
  client?.release();
  await pool.end();
});

async function expectPreserved() {
  expect(
    (
      await client.query(
        "SELECT count(*)::int AS total FROM app_workflow_definition_versions",
      )
    ).rows[0].total,
  ).toBe(2);
  expect(
    (
      await client.query(
        "SELECT count(*)::int AS total FROM app_workflow_stage_document_requirements",
      )
    ).rows[0].total,
  ).toBe(1);
  expect(
    (
      await client.query(
        "SELECT count(*)::int AS total FROM app_workflow_audit_entries",
      )
    ).rows[0].total,
  ).toBe(0);
}

(enabled ? describe : describe.skip)(
  "draft-only template deletion on PostgreSQL",
  () => {
    it("projects draft-only eligibility across all versions, including paginated history", async () => {
      expect((await listWorkflowTemplatePage(1, 10)).items[0].draftOnly).toBe(
        true,
      );
      await client.query(
        "UPDATE app_workflow_definition_versions SET status='PUBLISHED' WHERE id=$1",
        [first],
      );
      expect((await listWorkflowTemplatePage(1, 10)).items[0].draftOnly).toBe(
        false,
      );
      const latestPage = await listWorkflowTemplateVersionPage(
        templateId,
        1,
        1,
      );
      expect(latestPage.items[0]).toMatchObject({
        draftOnly: false,
        currentVersionId: latest,
        isLatest: true,
      });
      expect(
        (await listWorkflowTemplateVersionPage(templateId, 2, 1)).items[0]
          .draftOnly,
      ).toBe(false);
    });
    it("deletes all drafts and dependent configuration, retains linked forms and records the deletion atomically", async () => {
      expect(await deleteWorkflowDefinition(input)).toBe(templateId);
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS total FROM app_workflow_definitions",
          )
        ).rows[0].total,
      ).toBe(0);
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS total FROM app_form_versions",
          )
        ).rows[0].total,
      ).toBe(1);
      for (const table of [
        ...stageChildren,
        "app_workflow_form_migrations",
        "app_stage_task_form_bindings",
      ]) {
        expect(
          (await client.query(`SELECT count(*)::int AS total FROM ${table}`))
            .rows[0].total,
        ).toBe(0);
      }
      const audit = (
        await client.query(
          "SELECT action, before, after FROM app_workflow_audit_entries",
        )
      ).rows[0];
      expect(audit.action).toBe("WORKFLOW_DEFINITION_DELETED");
      expect(audit.before.versions).toHaveLength(2);
      expect(audit.before.conversions).toHaveLength(1);
      expect(audit.after).toEqual({ deleted: true });
    });

    it.each(["PUBLISHED", "RETIRED", "APPROVED", "PENDING_APPROVAL"])(
      "protects %s history even when the latest version is a draft",
      async (status) => {
        await client.query(
          "UPDATE app_workflow_definition_versions SET status=$1 WHERE id=$2",
          [status, first],
        );
        expect(await deleteWorkflowDefinition(input)).toBeNull();
        await expectPreserved();
      },
    );

    it("rejects stale revisions and non-current versions", async () => {
      expect(
        await deleteWorkflowDefinition({
          ...input,
          definitionId: randomUUID(),
        }),
      ).toBeNull();
      expect(
        await deleteWorkflowDefinition({ ...input, expectedRowVersion: 6 }),
      ).toBeNull();
      expect(
        await deleteWorkflowDefinition({ ...input, versionId: first }),
      ).toBeNull();
      await expectPreserved();
    });

    it("rolls back configuration and audit deletion when a draft is externally referenced", async () => {
      await client.query(
        "INSERT INTO deletion_external_reference VALUES ($1)",
        [latest],
      );
      expect(await deleteWorkflowDefinition(input)).toBeNull();
      await expectPreserved();
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS total FROM app_workflow_form_migrations",
          )
        ).rows[0].total,
      ).toBe(1);
    });

    it("registers the dedicated delete permission idempotently without granting it to readers", async () => {
      const migration = await readFile(
        new URL(
          "../../drizzle/0209_workflow_template_draft_delete_permission.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client.query(
        "INSERT INTO app_capabilities(code) VALUES ('workflow.definition.update'), ('workflow.definition.read')",
      );
      await client.query(
        `INSERT INTO app_role_capabilities
      SELECT $1::uuid, id FROM app_capabilities WHERE code='workflow.definition.update'
      UNION ALL SELECT $2::uuid, id FROM app_capabilities WHERE code='workflow.definition.read'`,
        [first, latest],
      );
      await client.query(migration);
      await client.query(migration);
      const grants =
        await client.query(`SELECT role_id FROM app_role_capabilities grant_row
      JOIN app_capabilities permission ON permission.id=grant_row.capability_id
      WHERE permission.code='workflow.definition.draft.delete.all'`);
      expect(grants.rows).toEqual([{ role_id: first }]);
    });
  },
);
