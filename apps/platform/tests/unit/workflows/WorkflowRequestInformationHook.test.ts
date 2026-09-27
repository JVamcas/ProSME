import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRfiRepository", () => ({
  createWorkflowRfi: vi.fn(),
}));

import {
  buildRequestInformationCreationRequest,
  createRequestInformation,
} from "@/modules/workflows/application/runtime/WorkflowRequestInformationHook";
import { createWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const applicationId = "20000000-0000-4000-8000-000000000001";
const workflowInstanceId = "30000000-0000-4000-8000-000000000001";
const workflowVersionId = "40000000-0000-4000-8000-000000000001";
const stageInstanceId = "50000000-0000-4000-8000-000000000001";
const stageDefinitionId = "60000000-0000-4000-8000-000000000001";
const taskId = "70000000-0000-4000-8000-000000000001";
const actionDefinitionId = "80000000-0000-4000-8000-000000000001";
const correlationId = "90000000-0000-4000-8000-000000000001";
const idempotencyKey = "a0000000-0000-4000-8000-000000000001";
const requirementId = "b0000000-0000-4000-8000-000000000001";

function request() {
  return buildRequestInformationCreationRequest({
    actorId,
    command: {
      actionKey: "REQUEST_INFORMATION",
      correlationId,
      expectedRuntimeVersion: 4,
      idempotencyKey,
      input: {
        actionType: "REQUEST_INFORMATION",
        editableFieldPaths: ["application.financial.turnover"],
        instructions: "Please clarify the turnover amount.",
        requestedDocumentRequirementIds: [requirementId],
      },
      sourceStageInstanceId: stageInstanceId,
      taskId,
      workflowInstanceId,
    },
    target: {
      action: {
        actionType: "REQUEST_INFORMATION",
        condition: null,
        configuration: {
          continuation: "RESUME_SOURCE_TASK",
          deadlineDays: 10,
          editableFieldPaths: ["application.financial.turnover"],
          expiryAction: "RETURN",
          participantScope: "APPLICATION_OWNER_AND_REQUESTER",
          recipientScope: "APPLICATION_OWNER",
          reminderDayOffsets: [3],
        },
        displayOrder: 1,
        enabled: true,
        id: actionDefinitionId,
        label: "Request information",
        reasonCodeRequired: false,
        stableKey: "REQUEST_INFORMATION",
      },
      stage: {
        application: { id: applicationId },
        completedAt: null,
        eligibility: {},
        exitCondition: null,
        fundingCall: {},
        rowVersion: 4,
        stageDefinitionId,
        stageInstanceId,
        stageKey: "SCREENING",
        status: "ACTIVE",
        workflowInstanceId,
        workflowVersionId,
      },
      task: {
        assignedToActor: true,
        id: taskId,
        permissions: {},
        rowVersion: 2,
        status: "IN_PROGRESS",
      },
    } as never,
  });
}

describe("workflow request information hook", () => {
  it("carries stable source, scope, deadline and continuation references", () => {
    expect(request()).toEqual({
      applicationId,
      continuation: {
        behavior: "RESUME_SOURCE_TASK",
        sourceStageInstanceId: stageInstanceId,
        sourceTaskId: taskId,
      },
      correlationId,
      deadline: {
        days: 10,
        expiryAction: "RETURN",
        reminderDayOffsets: [3],
      },
      editableFieldPaths: ["application.financial.turnover"],
      idempotencyKey,
      initiationType: "MANUAL",
      instructions: "Please clarify the turnover amount.",
      participantScope: "APPLICATION_OWNER_AND_REQUESTER",
      question: "Please clarify the turnover amount.",
      recipientScope: "APPLICATION_OWNER",
      requestedDocumentRequirementIds: [requirementId],
      requesterId: actorId,
      source: {
        actionDefinitionId,
        actionKey: "REQUEST_INFORMATION",
        stageDefinitionId,
        stageInstanceId,
        stageKey: "SCREENING",
        taskId,
        workflowInstanceId,
        workflowVersionId,
      },
    });
  });

  it("delegates creation to the Phase 11 lifecycle handler", async () => {
    const transaction = {} as never;
    vi.mocked(createWorkflowRfi).mockResolvedValue({
      deadlineAt: new Date("2027-01-01T00:00:00.000Z"),
      requestInformationId: "c0000000-0000-4000-8000-000000000001",
      status: "OPEN",
    });
    await expect(
      createRequestInformation(transaction, request()),
    ).resolves.toMatchObject({ status: "OPEN" });
    expect(createWorkflowRfi).toHaveBeenCalledWith(transaction, request());
  });
});
