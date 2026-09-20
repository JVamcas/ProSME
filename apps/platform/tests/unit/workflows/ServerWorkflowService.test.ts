import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  findDraftByDefinition: vi.fn(),
  findLatestWorkflowVersionId: vi.fn(),
  findWorkflowVersion: vi.fn(),
  listPublishedWorkflowVersions: vi.fn(),
  listWorkflowAssignmentOptions: vi
    .fn()
    .mockResolvedValue({ roles: [], users: [] }),
  listWorkflowDefinitions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({
    cloneWorkflowVersion: vi.fn(),
    createWorkflowDefinition: vi.fn(),
    replaceWorkflowDraft: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowLifecycleRepository",
  () => ({
    findLifecycleReplay: vi.fn(),
    publishWorkflowVersion: vi.fn(),
    retireWorkflowVersion: vi.fn(),
  }),
);
vi.mock("@/db/repositories/WorkflowAssignmentRepository", () => ({
  assignWorkflowToOpportunity: vi.fn(),
  listWorkflowAssignments: vi.fn(),
}));
vi.mock("@/modules/funding-calls/ServerFundingOpportunityIntegration", () => ({
  findPublishedFundingOpportunity: vi.fn(),
  listPublishedFundingOpportunities: vi.fn(),
}));
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  assignWorkflowToOpportunity,
  listWorkflowAssignments,
} from "@/db/repositories/WorkflowAssignmentRepository";
import {
  findLifecycleReplay,
  publishWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  findConfigurationReferences,
  findWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { assignOpportunityWorkflow } from "@/modules/workflows/ServerWorkflowAssignmentService";
import {
  publishWorkflow,
  retireWorkflow,
} from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";
import {
  getWorkflowDefinitions,
  updateWorkflowDraft,
  WorkflowConflictError,
} from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { workflowEditorView } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { actor, record, userWith } from "./WorkflowServiceFixtures";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    roles: new Set(),
    users: new Map([[actor.id, "active"]]),
  });
});
describe("workflow service authorization and lifecycle", () => {
  it("rejects workflow reads without the explicit capability", async () => {
    await expect(getWorkflowDefinitions(userWith())).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
  });

  it("checks update capability before resolving a mutable draft", async () => {
    await expect(
      updateWorkflowDraft(
        userWith(),
        "definition-id",
        { expectedRowVersion: 1, graph: referenceWorkflow },
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects retirement without the explicit lifecycle capability", async () => {
    await expect(
      retireWorkflow(
        userWith(permissionCodes.workflowDefinitionRead),
        record.definition.id,
        record.version.id,
        2,
        "retire-key",
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("publishes an approved version with optimistic version and idempotency data", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue(record);
    vi.mocked(publishWorkflowVersion).mockResolvedValue({
      ...record.version,
      status: "PUBLISHED",
    });
    const result = await publishWorkflow(
      userWith(permissionCodes.workflowDefinitionPublish),
      record.definition.id,
      record.version.id,
      1,
      "publish-key",
      "79e20de0-3558-4d63-90a4-8c9f5125df08",
    );
    expect(result.version.id).toBe(record.version.id);
    expect(publishWorkflowVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRowVersion: 1,
        idempotencyKey: "publish-key",
        versionId: record.version.id,
      }),
    );
  });

  it("does not publish an invalid graph", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue({
      ...record,
      graph: { stages: [referenceWorkflow.stages[0]], transitions: [] },
    });
    await expect(
      publishWorkflow(
        userWith(permissionCodes.workflowDefinitionPublish),
        record.definition.id,
        record.version.id,
        1,
        "publish-key",
        "79e20de0-3558-4d63-90a4-8c9f5125df08",
      ),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(publishWorkflowVersion).not.toHaveBeenCalled();
  });

  it("rejects an escalation target that is not an active role", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].actions = [
      {
        stableKey: "ESCALATE_REVIEW",
        label: "Escalate review",
        actionType: "ESCALATE",
        enabled: true,
        reasonCodeRequired: false,
        displayOrder: 1,
        configuration: {
          targetType: "ROLE",
          targetId: "79e20de0-3558-4d63-90a4-8c9f5125df09",
          trigger: "SLA_BREACH",
        },
      },
    ];
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_ESCALATION_ROLE" }),
      ]),
    );
  });
});

describe("funding-opportunity workflow assignment", () => {
  const input = {
    expectedRowVersion: 0,
    fundingOpportunityId: 42,
    fundingOpportunityTitle: "Client value is replaced",
    workflowVersionId: record.version.id,
  };

  it("requires workflow update authority", async () => {
    await expect(
      assignOpportunityWorkflow(
        userWith(),
        input,
        "assignment-key",
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects a draft workflow version", async () => {
    vi.mocked(findWorkflowVersion).mockResolvedValue({
      id: record.version.id,
      status: "DRAFT",
    });
    await expect(
      assignOpportunityWorkflow(
        userWith(permissionCodes.workflowDefinitionUpdate),
        input,
        "assignment-key",
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(assignWorkflowToOpportunity).not.toHaveBeenCalled();
  });

  it("resolves the published opportunity title and audits through the repository", async () => {
    vi.mocked(findWorkflowVersion).mockResolvedValue({
      id: record.version.id,
      status: "PUBLISHED",
    });
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue({
      id: 42,
      title: "Growth Fund",
    } as never);
    vi.mocked(assignWorkflowToOpportunity).mockResolvedValue({
      assignedAt: new Date().toISOString(),
      fundingOpportunityId: 42,
      fundingOpportunityTitle: "Growth Fund",
      rowVersion: 1,
      versionNumber: 1,
      workflowName: "Reference",
      workflowVersionId: record.version.id,
    });
    await expect(
      assignOpportunityWorkflow(
        userWith(permissionCodes.workflowDefinitionUpdate),
        input,
        "assignment-key",
        "79e20de0-3558-4d63-90a4-8c9f5125df08",
      ),
    ).resolves.toMatchObject({ fundingOpportunityTitle: "Growth Fund" });
    expect(assignWorkflowToOpportunity).toHaveBeenCalledWith(
      expect.objectContaining({
        fundingOpportunityTitle: "Growth Fund",
        idempotencyKey: "assignment-key",
      }),
    );
  });

  it("replays the original assignment result after a later reassignment", async () => {
    const original = {
      assignedAt: "2026-09-14T08:00:00.000Z",
      fundingOpportunityId: 42,
      fundingOpportunityTitle: "Growth Fund",
      rowVersion: 1,
      versionNumber: 1,
      workflowName: "Original workflow",
      workflowVersionId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    };
    vi.mocked(findLifecycleReplay).mockResolvedValue({
      action: "FUNDING_OPPORTUNITY_WORKFLOW_ASSIGNED",
      after: original,
      targetId: "42",
    });
    vi.mocked(listWorkflowAssignments).mockResolvedValue([
      {
        ...original,
        assignedAt: new Date(),
        rowVersion: 2,
        workflowName: "Later workflow",
      },
    ]);

    await expect(
      assignOpportunityWorkflow(
        userWith(permissionCodes.workflowDefinitionUpdate),
        input,
        "assignment-key",
        "correlation-id",
      ),
    ).resolves.toEqual(original);
    expect(listWorkflowAssignments).not.toHaveBeenCalled();
    expect(assignWorkflowToOpportunity).not.toHaveBeenCalled();
  });
});
