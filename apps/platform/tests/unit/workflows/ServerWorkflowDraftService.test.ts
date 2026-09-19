import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findDraftByDefinition: vi.fn(),
  findLatestWorkflowVersionId: vi.fn(),
  listPublishedWorkflowVersions: vi.fn(),
  listWorkflowDefinitions: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({
    createWorkflowDefinition: vi.fn(),
    replaceWorkflowDraft: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowDetailsRepository", () => ({
  updateWorkflowDefinitionDetails: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  () => ({
    WorkflowConflictError: class WorkflowConflictError extends Error {},
    WorkflowNotFoundError: class WorkflowNotFoundError extends Error {},
    workflowEditorView: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { replaceWorkflowDraft } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import {
  updateWorkflowDraft,
  updateWorkflowDetails,
} from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { workflowEditorView } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowDefinitionUpdate]),
  createdAt: new Date(),
  displayName: "Workflow administrator",
  email: "workflow@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "firebase-workflow-admin",
  lastLoginAt: null,
  roleCodes: new Set(["system_administrator"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

describe("workflow draft updates", () => {
  it("rejects edits when no draft exists", async () => {
    vi.mocked(findDraftByDefinition).mockResolvedValue(null);
    vi.mocked(findLatestWorkflowVersionId).mockResolvedValue("published-id");
    await expect(
      updateWorkflowDraft(
        actor,
        "definition-id",
        { expectedRowVersion: 2, graph: referenceWorkflow },
        "correlation-id",
      ),
    ).rejects.toThrow("Only draft versions can be edited.");
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it("updates workflow details with optimistic version data", async () => {
    vi.mocked(findDraftByDefinition).mockResolvedValue("draft-id");
    vi.mocked(updateWorkflowDefinitionDetails).mockResolvedValue("draft-id");
    vi.mocked(workflowEditorView).mockResolvedValue(undefined as never);

    await updateWorkflowDetails(
      actor,
      "definition-id",
      {
        code: "UPDATED",
        description: "Updated details",
        expectedRowVersion: 2,
        name: "Updated workflow",
      },
      "correlation-id",
    );
    expect(updateWorkflowDefinitionDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: "definition-id",
        expectedRowVersion: 2,
        versionId: "draft-id",
      }),
    );
  });
});
