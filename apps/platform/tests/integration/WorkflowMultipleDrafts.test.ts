import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { cloneWorkflow } from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";
import { updateWorkflowDraft } from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { findDraftByDefinition } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { listWorkflowTemplateVersions } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { userWith } from "../unit/workflows/WorkflowServiceFixtures";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
afterAll(async () => { await pool?.end(); });

(enabled ? describe : describe.skip)("multiple workflow drafts on PostgreSQL", () => {
  it("allocates concurrent drafts and edits the chosen older draft independently", async () => {
    const actor = {
      ...userWith(permissionCodes.workflowDefinitionUpdate),
      id: randomUUID(),
    };
    await pool!.query(
      `INSERT INTO app_users (id, email, display_name, user_type, status)
       VALUES ($1, $2, 'Draft administrator', 'staff', 'active')`,
      [actor.id, `${actor.id}@example.test`],
    );
    const originalId = await createWorkflowDefinition({
      actorId: actor.id,
      code: `DRAFTS_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      correlationId: randomUUID(),
      description: "Concurrent workflow drafts",
      graph: { stages: [], transitions: [] },
      name: "Concurrent drafts",
    });
    const { rows: [original] } = await pool!.query<{ definition_id: string }>(
      "SELECT definition_id FROM app_workflow_definition_versions WHERE id = $1",
      [originalId],
    );
    const templateId = original.definition_id;
    const drafts = await Promise.all([1, 2].map(() => cloneWorkflow(
      actor,
      templateId,
      originalId,
      randomUUID(),
    )));
    expect(drafts.map((draft) => draft.version.number).sort()).toEqual([2, 3]);
    const versions = await listWorkflowTemplateVersions(templateId);
    expect(versions.map((version) => version.status)).toEqual(["DRAFT", "DRAFT", "DRAFT"]);
    expect(await findDraftByDefinition(templateId)).toBe(versions[2].id);

    const updated = await updateWorkflowDraft(actor, templateId, {
      versionId: originalId,
      expectedRowVersion: 1,
      graph: { stages: [], transitions: [] },
    }, randomUUID());
    expect(updated.version.id).toBe(originalId);
    expect(updated.version.rowVersion).toBe(2);
    expect((await listWorkflowTemplateVersions(templateId))
      .map((version) => version.rowVersion)).toEqual([2, 1, 1]);
  });
});
