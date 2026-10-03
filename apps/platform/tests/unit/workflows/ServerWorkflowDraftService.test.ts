import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateRepository",
  () => ({
    findWorkflowTemplateVersion: vi.fn(),
  }),
);
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
    loadWorkflowEditor: vi.fn(),
    workflowEditorView: vi.fn(),
  }),
);

import { findWorkflowTemplateVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createWorkflowDefinition,
  replaceWorkflowDraft,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { removeWorkflowStage } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import {
  createWorkflow,
  updateWorkflowDraft,
  updateWorkflowDetails,
} from "@/modules/workflows/application/definitions/ServerWorkflowService";
import {
  loadWorkflowEditor,
  workflowEditorView,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";

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
  it("edits the selected draft even when a newer draft exists", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      version: { id: "older-draft", status: "DRAFT" },
    } as never);
    vi.mocked(loadWorkflowEditor).mockResolvedValue({
      graph: referenceWorkflow,
    } as never);
    vi.mocked(replaceWorkflowDraft).mockResolvedValue("older-draft");
    await updateWorkflowDraft(
      actor,
      "definition-id",
      {
        versionId: "older-draft",
        expectedRowVersion: 2,
        graph: referenceWorkflow,
      },
      "correlation-id",
    );
    expect(findWorkflowTemplateVersion).toHaveBeenCalledWith(
      "definition-id",
      "older-draft",
    );
    expect(replaceWorkflowDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        versionId: "older-draft",
      }),
    );
    vi.mocked(replaceWorkflowDraft).mockClear();
  });

  it("rejects a draft from another template before writing", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue(null);
    await expect(
      updateWorkflowDraft(
        actor,
        "definition-id",
        {
          versionId: "foreign-draft",
          expectedRowVersion: 2,
          graph: referenceWorkflow,
        },
        "correlation-id",
      ),
    ).rejects.toThrow();
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it("rejects an explicitly selected published version", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      version: { id: "published", status: "PUBLISHED" },
    } as never);
    await expect(
      updateWorkflowDraft(
        actor,
        "definition-id",
        {
          versionId: "published",
          expectedRowVersion: 2,
          graph: referenceWorkflow,
        },
        "correlation-id",
      ),
    ).rejects.toThrow("Only draft versions can be edited.");
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it("creates an empty workflow instead of inserting a reference graph", async () => {
    vi.mocked(createWorkflowDefinition).mockResolvedValue("draft-id");
    vi.mocked(workflowEditorView).mockResolvedValue(undefined as never);

    await createWorkflow(
      {
        ...actor,
        capabilities: new Set([permissionCodes.workflowDefinitionCreate]),
      },
      {
        code: "CLIENT_WORKFLOW",
        description: "Configured from the client specification",
        name: "Client workflow",
      },
      "correlation-id",
    );

    expect(createWorkflowDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: { stages: [], transitions: [] },
      }),
    );
  });

  it("prevents stage deletion when only a published version exists", async () => {
    vi.mocked(findDraftByDefinition).mockResolvedValue(null);
    vi.mocked(findLatestWorkflowVersionId).mockResolvedValue("published-id");
    const graphAfterDeletion = removeWorkflowStage(
      referenceWorkflow,
      "COMPLETENESS",
    );
    await expect(
      updateWorkflowDraft(
        actor,
        "definition-id",
        { expectedRowVersion: 2, graph: graphAfterDeletion },
        "correlation-id",
      ),
    ).rejects.toThrow("Only draft versions can be edited.");
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it("reconciles action bindings before persisting a draft", async () => {
    const nextGraph = structuredClone(referenceWorkflow);
    nextGraph.stages[0].actions.push({
      actionType: "PUT_ON_HOLD",
      configuration: {
        reviewDateRequired: true,
        scope: "STAGE",
      },
      displayOrder: 2,
      enabled: true,
      label: "Put on hold",
      reasonRequired: true,
      stableKey: "PUT_ON_HOLD",
    });
    vi.mocked(findDraftByDefinition).mockResolvedValue("draft-id");
    vi.mocked(loadWorkflowEditor).mockResolvedValue({
      graph: referenceWorkflow,
    } as never);
    vi.mocked(replaceWorkflowDraft).mockResolvedValue("draft-id");
    vi.mocked(workflowEditorView).mockResolvedValue(undefined as never);

    await updateWorkflowDraft(
      actor,
      "definition-id",
      { expectedRowVersion: 2, graph: nextGraph },
      "correlation-id",
    );

    expect(replaceWorkflowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-id",
        graph: expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              tasks: [
                expect.objectContaining({
                  actionKeys: expect.arrayContaining(["PUT_ON_HOLD"]),
                }),
              ],
            }),
          ]),
        }),
      }),
    );
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
