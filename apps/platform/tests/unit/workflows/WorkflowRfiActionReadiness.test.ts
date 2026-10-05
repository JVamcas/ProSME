import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository",
  () => ({
    readWorkflowActionTaskReadiness: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadRequiredTaskCompletions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowQuorumRepository", () => ({
  evaluateStageQuorum: vi.fn(),
}));

import {
  readWorkflowActionReadiness,
  workflowActionReadinessReason,
} from "@/modules/workflows/application/runtime/ServerWorkflowActionReadinessService";
import { readWorkflowActionTaskReadiness } from "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository";

beforeEach(() => vi.clearAllMocks());

describe("RFI action readiness", () => {
  it.each([false, true])(
    "checks existing requests even when only Request information is offered (%s)",
    async (hasOpenRfi) => {
      vi.mocked(readWorkflowActionTaskReadiness).mockResolvedValue({
        hasOpenRfi,
        workReady: false,
      });
      const readiness = await readWorkflowActionReadiness({} as never, {
        actionTypes: ["REQUEST_INFORMATION"],
        actorId: "reviewer",
        recordQuorumEvaluation: false,
        stageDefinitionId: "definition",
        stageInstanceId: "stage",
        taskId: "task",
      });
      expect(readWorkflowActionTaskReadiness).toHaveBeenCalledWith(
        {},
        "task",
        false,
      );
      expect(
        workflowActionReadinessReason("REQUEST_INFORMATION", readiness),
      ).toBe(
        hasOpenRfi
          ? "This task already has an open information request. Follow up or close it first."
          : null,
      );
    },
  );
});
