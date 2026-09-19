import { expect } from "vitest";
import { getWorkflowTemplateAudit } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import {
  actor,
  pool,
  templateId,
  version,
} from "./WorkflowTemplateDatabaseFixture";

export async function expectRetainedTemplateAudit() {
  const audit = await getWorkflowTemplateAudit(actor, templateId, version.id);
  expect(audit.map((entry) => entry.action)).toEqual(
    expect.arrayContaining([
      "WORKFLOW_CREATED",
      "WORKFLOW_DETAILS_UPDATED",
      "WORKFLOW_VERSION_PENDING_APPROVAL",
      "WORKFLOW_VERSION_DRAFT",
      "WORKFLOW_VERSION_APPROVED",
      "WORKFLOW_VERSION_PUBLISHED",
      "WORKFLOW_VERSION_RETIRED",
    ]),
  );
  await expect(
    pool!.query(`DELETE FROM app_workflow_audit_entries WHERE target_id = $1`, [
      version.id,
    ]),
  ).rejects.toThrow("audit entries are immutable");
}
