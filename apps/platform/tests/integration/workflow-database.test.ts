import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { assignWorkflowToOpportunity } from "@/db/repositories/WorkflowAssignmentRepository";
import {
  cloneWorkflowVersion,
  createWorkflowDefinition,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import {
  changeWorkflowTemplateLifecycle,
  publishWorkflowVersion,
  retireWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";

const { Pool } = pg;
const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const actorId = "41111111-1111-4111-8111-111111111111";
const correlationId = "42222222-2222-4222-8222-222222222222";
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
let definitionId = "";
let publishedVersionId = "";
async function query(text: string, values: unknown[] = []) {
  if (!pool)
    throw new Error("The P3.3 PostgreSQL test pool is not configured.");
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'workflow-admin@example.test', 'Workflow Admin', 'staff', 'active')`,
    [actorId],
  );
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("P3.3 PostgreSQL workflow persistence", () => {
  it("installs workflow tables, indexes, protections and capabilities", async () => {
    const result = await query(
      `SELECT
        to_regclass('app_workflow_definitions') AS definition_table,
        to_regclass('app_workflow_versions_one_draft_unique') AS draft_index,
        to_regclass('app_funding_workflow_version_idx') AS assignment_index,
        (SELECT count(*)::integer FROM app_capabilities WHERE code LIKE 'workflow.%') AS capability_count,
        (SELECT count(*)::integer FROM pg_trigger WHERE tgname IN (
          'app_workflow_versions_lifecycle', 'app_workflow_stages_immutable',
          'app_stage_tasks_immutable', 'app_workflow_transitions_immutable',
          'app_workflow_audit_immutable', 'app_funding_workflow_published_only'
        ) AND NOT tgisinternal) AS protection_count`,
    );
    expect(result.rows[0]).toEqual({
      assignment_index: "app_funding_workflow_version_idx",
      capability_count: 12,
      definition_table: "app_workflow_definitions",
      draft_index: "app_workflow_versions_one_draft_unique",
      protection_count: 6,
    });
  });

  it("round-trips the reference graph without per-stage queries", async () => {
    publishedVersionId = await createWorkflowDefinition({
      actorId,
      code: "DATABASE_REFERENCE",
      correlationId,
      description: "Integration workflow",
      graph: referenceWorkflow,
      name: "Database reference workflow",
    });
    const editor = await findWorkflowGraph(publishedVersionId);
    expect(editor?.graph.stages).toHaveLength(6);
    expect(editor?.graph.transitions).toHaveLength(6);
    expect(editor?.graph.stages[0].tasks[0].type).toBe("CHECKLIST");
    definitionId = editor!.definition.id;
  });

  it("publishes approved versions atomically and prevents child edits", async () => {
    await expect(
      query(
        `UPDATE app_workflow_definition_versions
         SET status = 'RETIRED', row_version = row_version + 1, retired_at = now()
         WHERE id = $1`,
        [publishedVersionId],
      ),
    ).rejects.toThrow("invalid workflow version lifecycle transition");
    await changeWorkflowTemplateLifecycle(
      {
        actorId,
        correlationId,
        expectedRowVersion: 1,
        idempotencyKey: "database-submit",
        versionId: publishedVersionId,
      },
      "SUBMIT",
    );
    await changeWorkflowTemplateLifecycle(
      {
        actorId,
        correlationId,
        expectedRowVersion: 2,
        idempotencyKey: "database-approve",
        versionId: publishedVersionId,
      },
      "APPROVE",
    );
    const published = await publishWorkflowVersion({
      actorId,
      correlationId,
      expectedRowVersion: 3,
      idempotencyKey: "database-publish",
      versionId: publishedVersionId,
    });
    expect(published?.status).toBe("PUBLISHED");
    const task = await query(
      `SELECT task.id FROM app_stage_task_definitions task
       JOIN app_workflow_stage_definitions stage ON stage.id = task.stage_id
       WHERE stage.version_id = $1 LIMIT 1`,
      [publishedVersionId],
    );
    await expect(
      query(
        `UPDATE app_stage_task_definitions SET name = 'Updated task' WHERE id = $1`,
        [task.rows[0].id],
      ),
    ).rejects.toThrow("only draft workflow versions are editable");
    await expect(
      query(
        `UPDATE app_workflow_transition_definitions
         SET priority = priority + 1 WHERE version_id = $1`,
        [publishedVersionId],
      ),
    ).rejects.toThrow("only draft workflow versions are editable");
    await expect(
      query(`DELETE FROM app_workflow_definition_versions WHERE id = $1`, [
        publishedVersionId,
      ]),
    ).rejects.toThrow("cannot be deleted");
  });

  it("clones the published graph and enforces one mutable draft", async () => {
    const source = await findWorkflowGraph(publishedVersionId);
    const draftId = await cloneWorkflowVersion({
      actorId,
      correlationId,
      definitionId,
      graph: source!.graph,
      sourceVersionId: publishedVersionId,
    });
    await expect(
      cloneWorkflowVersion({
        actorId,
        correlationId,
        definitionId,
        graph: source!.graph,
        sourceVersionId: publishedVersionId,
      }),
    ).rejects.toThrow();
    await query(
      `DELETE FROM app_workflow_transition_definitions WHERE version_id = $1`,
      [draftId],
    );
    const stages = await query(
      `SELECT id FROM app_workflow_stage_definitions WHERE version_id = $1`,
      [draftId],
    );
    await query(
      `DELETE FROM app_stage_task_definitions WHERE stage_id = ANY($1::uuid[])`,
      [stages.rows.map((row) => row.id)],
    );
    await query(
      `DELETE FROM app_workflow_action_definitions WHERE stage_id = ANY($1::uuid[])`,
      [stages.rows.map((row) => row.id)],
    );
    await query(
      `DELETE FROM app_workflow_stage_definitions WHERE version_id = $1`,
      [draftId],
    );
    await query(`DELETE FROM app_workflow_definition_versions WHERE id = $1`, [
      draftId,
    ]);
  });
});

describeDatabase("workflow binding compatibility", () => {
  it("assigns only a published version, audits it, and retires safely", async () => {
    const assignment = await assignWorkflowToOpportunity({
      actorId,
      correlationId,
      expectedRowVersion: 0,
      fundingOpportunityId: 3301,
      fundingOpportunityTitle: "Integration Funding Call",
      idempotencyKey: "database-assignment",
      workflowVersionId: publishedVersionId,
    });
    expect(assignment?.rowVersion).toBe(1);
    const audit = await query(
      `SELECT id FROM app_workflow_audit_entries WHERE idempotency_key = 'database-assignment'`,
    );
    await expect(
      query(
        `UPDATE app_workflow_audit_entries SET action = 'TAMPERED' WHERE id = $1`,
        [audit.rows[0].id],
      ),
    ).rejects.toThrow("workflow audit entries are immutable");
    await expect(
      query(
        `UPDATE app_workflow_definition_versions
         SET status = 'RETIRED', row_version = row_version + 1, retired_at = now()
         WHERE id = $1`,
        [publishedVersionId],
      ),
    ).rejects.toThrow("invalid workflow version lifecycle transition");
    const retired = await retireWorkflowVersion({
      actorId,
      correlationId,
      expectedRowVersion: 4,
      idempotencyKey: "database-retire",
      versionId: publishedVersionId,
    });
    expect(retired?.status).toBe("RETIRED");
    const remainingAssignments = await query(
      `SELECT count(*)::integer AS count
       FROM app_funding_opportunity_workflows
       WHERE workflow_version_id = $1`,
      [publishedVersionId],
    );
    expect(remainingAssignments.rows[0].count).toBe(0);
    const retirementAudit = await query(
      `SELECT after FROM app_workflow_audit_entries
       WHERE idempotency_key = 'database-retire'`,
    );
    expect(retirementAudit.rows[0].after.detachedAssignmentCount).toBe(1);
  });

  it("uses reviewed indexes for definition and assignment projections", async () => {
    await query(
      `WITH inserted_definitions AS (
         INSERT INTO app_workflow_definitions (code, name)
         SELECT 'PLAN_' || value, 'Plan workflow ' || value
         FROM generate_series(1, 2000) value
         RETURNING id, code
       ), inserted_versions AS (
         INSERT INTO app_workflow_definition_versions
           (definition_id, version_number, created_by)
         SELECT id, 1, $1
         FROM inserted_definitions
         RETURNING id
       )
       SELECT count(*) FROM inserted_versions`,
      [actorId],
    );
    for (const status of ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"]) {
      await query(
        `UPDATE app_workflow_definition_versions SET status = $1,
          row_version = row_version + 1,
          published_by = CASE WHEN $1 = 'PUBLISHED' THEN $2::uuid ELSE NULL END,
          published_at = CASE WHEN $1 = 'PUBLISHED' THEN now() ELSE NULL END
         WHERE definition_id IN (SELECT id FROM app_workflow_definitions WHERE code LIKE 'PLAN_%')`,
        [status, actorId],
      );
    }
    await query(
      `INSERT INTO app_funding_opportunity_workflows
        (funding_opportunity_id, funding_opportunity_title, workflow_version_id, assigned_by)
       SELECT 5000 + row_number() OVER (), 'Plan funding call', version.id, $1
       FROM app_workflow_definition_versions version JOIN app_workflow_definitions template
         ON template.id = version.definition_id WHERE template.code LIKE 'PLAN_%'`,
      [actorId],
    );
    await query(`ANALYZE app_workflow_definition_versions`);
    await query(`ANALYZE app_funding_opportunity_workflows`);
    const definitions = await query(
      `EXPLAIN (FORMAT JSON) SELECT definition_id, version_number, status
       FROM app_workflow_definition_versions
       WHERE definition_id = $1 AND status = 'RETIRED'`,
      [definitionId],
    );
    const assignments = await query(
      `EXPLAIN (FORMAT JSON) SELECT funding_opportunity_id, workflow_version_id
       FROM app_funding_opportunity_workflows WHERE workflow_version_id = $1`,
      [publishedVersionId],
    );
    expect(JSON.stringify(definitions.rows)).toContain(
      "app_workflow_versions_definition_status_idx",
    );
    expect(JSON.stringify(assignments.rows)).toContain(
      "app_funding_workflow_version_idx",
    );
  });
});
