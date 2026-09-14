import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/WorkflowRepository", () => ({
  findDraftByDefinition: vi.fn(),
  findLatestWorkflowVersionId: vi.fn(),
  listPublishedWorkflowVersions: vi.fn(),
  listWorkflowDefinitions: vi.fn(),
}));
vi.mock("@/db/repositories/WorkflowDraftRepository", () => ({
  createWorkflowDefinition: vi.fn(),
  replaceWorkflowDraft: vi.fn(),
}));
vi.mock("@/modules/workflows/ServerWorkflowSupport", () => ({
  WorkflowConflictError: class WorkflowConflictError extends Error {},
  WorkflowNotFoundError: class WorkflowNotFoundError extends Error {},
  workflowEditorView: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import type { AuthenticatedUser } from "@/auth/types";
import { replaceWorkflowDraft } from "@/db/repositories/WorkflowDraftRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
} from "@/db/repositories/WorkflowRepository";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import { updateWorkflowDraft } from "@/modules/workflows/ServerWorkflowService";
import { workflowEditorView } from "@/modules/workflows/ServerWorkflowSupport";

const actor: AuthenticatedUser = {
  capabilities: new Set([capabilities.workflowDefinitionUpdate]),
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
  it("updates the latest published version when no draft exists", async () => {
    vi.mocked(findDraftByDefinition).mockResolvedValue(null);
    vi.mocked(findLatestWorkflowVersionId).mockResolvedValue("published-id");
    vi.mocked(replaceWorkflowDraft).mockResolvedValue("published-id");
    vi.mocked(workflowEditorView).mockResolvedValue(undefined as never);

    await updateWorkflowDraft(
      actor,
      "definition-id",
      { expectedRowVersion: 2, graph: referenceWorkflow },
      "correlation-id",
    );
    expect(replaceWorkflowDraft).toHaveBeenCalledWith(
      expect.objectContaining({ versionId: "published-id" }),
    );
  });
});
