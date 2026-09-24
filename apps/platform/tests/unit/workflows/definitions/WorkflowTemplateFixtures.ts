import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import type { WorkflowTemplateStatus } from "@/modules/workflows/domain/definitions/WorkflowTemplate";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

export const templateId = "41111111-1111-4111-8111-111111111111";
export const versionId = "42222222-2222-4222-8222-222222222222";
export const correlationId = "43333333-3333-4333-8333-333333333333";
export const metadata = {
  code: "TEST",
  name: "Test template",
  description: "",
};
export const actor: AuthenticatedUser = {
  id: templateId,
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
export const version = {
  id: versionId,
  definitionId: templateId,
  status: "DRAFT" as WorkflowTemplateStatus,
  versionNumber: 1,
  rowVersion: 1,
  metadata,
  createdBy: actor.id,
  publishedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: null,
  retiredAt: null,
};
export const template = {
  ...metadata,
  id: templateId,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
export const input = {
  templateId,
  versionId,
  expectedRowVersion: 1,
  idempotencyKey: "lifecycle-key",
};

const assignedGraph = structuredClone(referenceWorkflow);
assignedGraph.stages.forEach((stage) => {
  stage.tasks.forEach((task) => {
    task.roleId = actor.id;
  });
});

export const workflowGraphRecord = {
  definition: template,
  graph: assignedGraph,
  version,
};
