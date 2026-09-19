import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll } from "vitest";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import { changeWorkflowTemplateStatus } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import type { WorkflowTemplateVersion } from "@/modules/workflows/domain/definitions/WorkflowTemplate";

export const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
export const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
export const actor: AuthenticatedUser = {
  id: randomUUID(),
  status: "active",
  email: "governance@example.test",
  displayName: "Governance",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: "workflow-governance-test",
  roleCodes: new Set<string>(),
  capabilities: new Set(Object.values(permissionCodes)),
};
export const correlationId = randomUUID();
export const metadata = {
  code: "GOVERNANCE",
  name: "Governed template",
  description: "Version 1",
};
export let templateId: string;
export let version: WorkflowTemplateVersion;

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'governance@example.test', 'Governance', 'staff', 'active')`,
    [actor.id],
  );
});
afterAll(async () => {
  await pool?.end();
});

export async function change(
  command: "SUBMIT" | "APPROVE" | "PUBLISH" | "RETIRE" | "RETURN",
) {
  const result = await changeWorkflowTemplateStatus(
    actor,
    {
      templateId,
      versionId: version.id,
      expectedRowVersion: version.rowVersion,
      idempotencyKey: randomUUID(),
      command,
      reason: "Please clarify the description",
    },
    correlationId,
  );
  version = result.version;
  return result;
}

export function setVersion(value: WorkflowTemplateVersion) {
  version = value;
  templateId = value.definitionId;
}
