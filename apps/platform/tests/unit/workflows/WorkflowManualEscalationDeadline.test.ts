import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowDeadlineActionRepository", () => ({
  loadBoundDeadlineActions: vi.fn(),
  recordScheduledWorkflowAction: vi.fn(),
  cancelSourceForScheduledReturn: vi.fn(),
  hasActiveDeadlineEscalation: vi.fn(),
}));

import { executeWorkflowDeadlineAction } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineActionService";
import { loadBoundDeadlineActions } from "@/modules/workflows/infrastructure/WorkflowDeadlineActionRepository";

it("does not execute an escalation automatically when an SLA is breached", async () => {
  await executeWorkflowDeadlineAction({} as never, {
    actionType: "ESCALATE",
    candidate: { kind: "SLA_BREACH" },
    correlationId: "sla-test",
    occurredAt: new Date(),
    stage: {},
  } as never);
  expect(loadBoundDeadlineActions).not.toHaveBeenCalled();
});
