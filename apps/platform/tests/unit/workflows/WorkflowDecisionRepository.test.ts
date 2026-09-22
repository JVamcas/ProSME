import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  workflowAuditEntries,
  workflowDecisions,
  workflowEvents,
} from "@/db/schema";
import { recordApprovalDecision } from "@/modules/workflows/infrastructure/WorkflowDecisionRepository";

describe("workflow approval decision repository", () => {
  it("records the decision, event and audit reference atomically", async () => {
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    const transaction = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((value: unknown) => {
          inserted.push({ table, value });
          return Promise.resolve();
        }),
      })),
    } as never;
    const decidedAt = new Date("2026-09-22T08:00:00.000Z");

    await recordApprovalDecision(transaction, {
      actionDefinitionId: "10000000-0000-4000-8000-000000000001",
      actionExecutionId: "20000000-0000-4000-8000-000000000001",
      actionKey: "ADVANCE",
      actorId: "30000000-0000-4000-8000-000000000001",
      correlationId: "40000000-0000-4000-8000-000000000001",
      decidedAt,
      decisionId: "50000000-0000-4000-8000-000000000001",
      normalizedInput: {
        actionType: "APPROVE_ADVANCE",
        comment: "Required work verified.",
      },
      sourceStageInstanceId: "60000000-0000-4000-8000-000000000001",
      taskId: "70000000-0000-4000-8000-000000000001",
      workflowInstanceId: "80000000-0000-4000-8000-000000000001",
    });

    expect(inserted).toEqual(expect.arrayContaining([
      {
        table: workflowDecisions,
        value: expect.objectContaining({
          actionDefinitionId: "10000000-0000-4000-8000-000000000001",
          actionExecutionId: "20000000-0000-4000-8000-000000000001",
          actorId: "30000000-0000-4000-8000-000000000001",
          decidedAt,
          input: {
            actionType: "APPROVE_ADVANCE",
            comment: "Required work verified.",
          },
          outcome: "APPROVED",
        }),
      },
      {
        table: workflowEvents,
        value: expect.objectContaining({ eventCode: "DECISION_RECORDED" }),
      },
      {
        table: workflowAuditEntries,
        value: expect.objectContaining({
          action: "DECISION_RECORDED",
          targetType: "WORKFLOW_DECISION",
        }),
      },
    ]));
  });
});
