import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { workflowActionExecutions, workflowAuditEntries } from "@/db/schema";
import { recordWorkflowActionExecution } from "@/modules/workflows/infrastructure/WorkflowActionExecutionRecordsRepository";

describe("workflow action reason persistence", () => {
  it.each([undefined, "Reviewed the supporting evidence.\n".repeat(10)])(
    "stores optional free-text reasons consistently in execution and audit records",
    async (reason) => {
      const records = new Map<unknown, unknown>();
      const transaction = {
        insert: (table: unknown) => ({
          values: async (value: unknown) => {
            records.set(table, value);
          },
        }),
      } as never;
      await recordWorkflowActionExecution(transaction, {
        action: {
          actionType: "REJECT",
          configuration: {
            outcome: { type: "TRANSITION" },
            reversibleActionKey: null,
          },
          displayOrder: 1,
          enabled: true,
          id: "action-id",
          label: "Reject",
          reasonRequired: false,
          stableKey: "REJECT",
        },
        actorId: "actor-id",
        conditionEvaluation: {},
        correlationId: "correlation-id",
        expectedRuntimeVersion: 1,
        id: "execution-id",
        idempotencyKey: "idempotency-key",
        normalizedInput: {
          actionType: "REJECT",
          ...(reason ? { reason } : {}),
        },
        resolvedTarget: null,
        result: {
          actionExecutionId: "execution-id",
          actionKey: "REJECT",
          actionType: "REJECT",
          decisionId: null,
          executedAt: "2026-10-03T08:00:00.000Z",
          resultingRuntimeVersion: 2,
          requestInformationId: null,
          sourceStageInstanceId: "stage-id",
          taskId: null,
          transition: { kind: "NONE", targets: [], workflowStatus: "ACTIVE" },
          workflowInstanceId: "workflow-id",
        },
        resultingRuntimeVersion: 2,
        sourceStageInstanceId: "stage-id",
        taskBefore: null,
        taskId: null,
        workflowInstanceId: "workflow-id",
      });
      expect(records.get(workflowActionExecutions)).toMatchObject({
        reason: reason ?? null,
        normalizedInput: {
          actionType: "REJECT",
          ...(reason ? { reason } : {}),
        },
      });
      expect(records.get(workflowAuditEntries)).toMatchObject({ reason });
      expect(records.get(workflowActionExecutions)).not.toHaveProperty(
        "reasonCode",
      );
    },
  );
});
