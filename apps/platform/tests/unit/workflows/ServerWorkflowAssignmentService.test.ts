import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findWorkflowVersion: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowLifecycleRepository",
  () => ({ findLifecycleReplay: vi.fn() }),
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
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { WorkflowConflictError } from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { findLifecycleReplay } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { assignOpportunityWorkflow } from "@/modules/workflows/ServerWorkflowAssignmentService";
import { record, userWith } from "./WorkflowServiceFixtures";

const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";
const input = {
  expectedRowVersion: 0,
  fundingOpportunityId,
  fundingOpportunityTitle: "Client value is replaced",
  workflowVersionId: record.version.id,
};

beforeEach(() => vi.clearAllMocks());

describe("funding-opportunity workflow assignment", () => {
  it("requires workflow update authority", async () => {
    await expect(assignOpportunityWorkflow(
      userWith(),
      input,
      "assignment-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects a draft workflow version", async () => {
    vi.mocked(findWorkflowVersion).mockResolvedValue({
      id: record.version.id,
      status: "DRAFT",
    });
    await expect(assignOpportunityWorkflow(
      userWith(permissionCodes.workflowDefinitionUpdate),
      input,
      "assignment-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(assignWorkflowToOpportunity).not.toHaveBeenCalled();
  });

  it("resolves the published opportunity title and audits it", async () => {
    vi.mocked(findWorkflowVersion).mockResolvedValue({
      id: record.version.id,
      status: "PUBLISHED",
    });
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue({
      id: fundingOpportunityId,
      title: "Growth Fund",
    } as never);
    vi.mocked(assignWorkflowToOpportunity).mockResolvedValue({
      assignedAt: new Date().toISOString(),
      fundingOpportunityId,
      fundingOpportunityTitle: "Growth Fund",
      rowVersion: 1,
      versionNumber: 1,
      workflowName: "Reference",
      workflowVersionId: record.version.id,
    });
    await expect(assignOpportunityWorkflow(
      userWith(permissionCodes.workflowDefinitionUpdate),
      input,
      "assignment-key",
      "79e20de0-3558-4d63-90a4-8c9f5125df08",
    )).resolves.toMatchObject({ fundingOpportunityTitle: "Growth Fund" });
    expect(assignWorkflowToOpportunity).toHaveBeenCalledWith(
      expect.objectContaining({
        fundingOpportunityTitle: "Growth Fund",
        idempotencyKey: "assignment-key",
      }),
    );
  });

  it("replays the original result after a later reassignment", async () => {
    const original = {
      assignedAt: "2026-09-14T08:00:00.000Z",
      fundingOpportunityId,
      fundingOpportunityTitle: "Growth Fund",
      rowVersion: 1,
      versionNumber: 1,
      workflowName: "Original workflow",
      workflowVersionId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    };
    vi.mocked(findLifecycleReplay).mockResolvedValue({
      action: "FUNDING_OPPORTUNITY_WORKFLOW_ASSIGNED",
      after: original,
      targetId: fundingOpportunityId,
    });
    vi.mocked(listWorkflowAssignments).mockResolvedValue([{
      ...original,
      assignedAt: new Date(),
      rowVersion: 2,
      workflowName: "Later workflow",
    }]);

    await expect(assignOpportunityWorkflow(
      userWith(permissionCodes.workflowDefinitionUpdate),
      input,
      "assignment-key",
      "correlation-id",
    )).resolves.toEqual(original);
    expect(listWorkflowAssignments).not.toHaveBeenCalled();
    expect(assignWorkflowToOpportunity).not.toHaveBeenCalled();
  });
});
