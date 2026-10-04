import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowTaskRuntimeContext } from "@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository";
import { readWorkflowEligibilityFormPreviews } from "@/modules/workflows/infrastructure/WorkflowEligibilityPreviewRepository";
import {
  formContextIds as id,
  installWorkflowEligibilityFormContextFixture,
} from "../support/WorkflowEligibilityFormContextFixture";

const enabled = process.env.RUN_WORKFLOW_FORM_CONTEXT_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
let client: pg.PoolClient;
let forms: Awaited<ReturnType<typeof installWorkflowEligibilityFormContextFixture>>;

beforeAll(async () => {
  if (!pool) return;
  client = await pool.connect();
  await client.query("BEGIN");
  vi.mocked(getDatabase).mockReturnValue(drizzle(client) as never);
  forms = await installWorkflowEligibilityFormContextFixture(client);
});

afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK");
    client.release();
  }
  await pool?.end();
});

describeDatabase("inherited eligibility form SQL against PostgreSQL", () => {
  it.each(["inheritedTask", "commandTask"] as const)(
    "loads %s without a template binding and with explicit empty context", async (task) => {
      const source = await readWorkflowTaskRuntimeContext(id.actor, id[task]);
      expect(source?.binding).toEqual({ formVersionId: forms.formVersionId, contextFields: [] });
    },
  );

  it("keeps explicit context for ordinary bound forms and rejects ordinary unbound forms", async () => {
    const source = await readWorkflowTaskRuntimeContext(id.actor, id.boundTask);
    expect(source?.binding.contextFields).toEqual([
      { key: "application.reference", label: "Reference", type: "TEXT" },
    ]);
    expect(await readWorkflowTaskRuntimeContext(id.actor, id.unboundTask)).toBeNull();
  });

  it("rejects a reviewer who does not own the task", async () => {
    expect(await readWorkflowTaskRuntimeContext(id.otherActor, id.inheritedTask)).toBeNull();
  });

  it("rejects inherited versions that differ from the application's pinned ruleset", async () => {
    await client.query(
      "UPDATE app_workflow_tasks SET form_version_id = $2 WHERE id = $1",
      [id.inheritedTask, forms.otherFormVersionId],
    );
    expect(await readWorkflowTaskRuntimeContext(id.actor, id.inheritedTask)).toBeNull();
    await client.query(
      "UPDATE app_workflow_tasks SET form_version_id = $2 WHERE id = $1",
      [id.inheritedTask, forms.formVersionId],
    );
  });

  it("retains the COI gate for inherited tasks", async () => {
    await client.query("UPDATE app_workflow_application_coi SET state = 'REVOKED' WHERE task_id = $1", [id.inheritedTask]);
    expect(await readWorkflowTaskRuntimeContext(id.actor, id.inheritedTask)).toBeNull();
    await client.query("UPDATE app_workflow_application_coi SET state = 'CLEARED_NO_CONFLICT' WHERE task_id = $1", [id.inheritedTask]);
  });

  it("rejects forms in inactive stages", async () => {
    await client.query("UPDATE app_workflow_stage_instances SET status = 'COMPLETED' WHERE id = $1", [id.stageInstance]);
    expect(await readWorkflowTaskRuntimeContext(id.actor, id.inheritedTask)).toBeNull();
    await client.query("UPDATE app_workflow_stage_instances SET status = 'ACTIVE' WHERE id = $1", [id.stageInstance]);
  });

  it("previews different ruleset forms for two calls using the same template version", async () => {
    const previews = await readWorkflowEligibilityFormPreviews(id.definition, id.version);
    expect(previews).toEqual([
      {
        fundingCallId: id.call, fundingCallTitle: "First call",
        eligibilityRuleSetVersionId: id.rulesVersion,
        formVersionId: forms.formVersionId, formName: "Eligibility baseline",
      },
      {
        fundingCallId: id.secondCall, fundingCallTitle: "Second call",
        eligibilityRuleSetVersionId: id.otherRulesVersion,
        formVersionId: forms.otherFormVersionId, formName: "Eligibility baseline",
      },
    ]);
    expect(await readWorkflowEligibilityFormPreviews(id.otherActor, id.version)).toBeNull();
  });

  it("distinguishes missing call configuration from no attached calls", async () => {
    await client.query("UPDATE app_funding_calls SET eligibility_rule_set_version_id = NULL WHERE id = $1", [id.call]);
    expect((await readWorkflowEligibilityFormPreviews(id.definition, id.version))?.[0])
      .toMatchObject({ fundingCallId: id.call, formVersionId: null });
    await client.query("UPDATE app_funding_calls SET workflow_template_version_id = NULL WHERE id IN ($1, $2)", [id.call, id.secondCall]);
    expect(await readWorkflowEligibilityFormPreviews(id.definition, id.version)).toEqual([]);
  });
});
