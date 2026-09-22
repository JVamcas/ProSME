import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const databaseExecute = vi.fn();
const transactionExecute = vi.fn();
const transaction = { execute: transactionExecute };
const databaseTransaction = vi.fn(
  async (work: (executor: typeof transaction) => Promise<unknown>) =>
    work(transaction),
);

vi.mock("@/db/client", () => ({
  getDatabase: () => ({
    execute: databaseExecute,
    transaction: databaseTransaction,
  }),
}));

vi.mock(
  "@/modules/workflows/infrastructure/RuntimeAuditWriteRepository",
  () => ({
    appendTaskCompletionAndActionAudit: vi.fn(),
    appendTaskCompletionAudit: vi.fn(),
  }),
);

import {
  appendTaskCompletionAndActionAudit,
  appendTaskCompletionAudit,
} from "@/modules/workflows/infrastructure/RuntimeAuditWriteRepository";
import { writeChecklistTaskCompletion } from "@/modules/workflows/infrastructure/WorkflowTaskActionRepository";

const command = {
  actionKey: null,
  actorId: "10000000-0000-4000-8000-000000000001",
  correlationId: "20000000-0000-4000-8000-000000000001",
  expectedRowVersion: 2,
  idempotencyKey: "30000000-0000-4000-8000-000000000001",
  items: [{ accepted: true, code: "DOCUMENTS_PRESENT" }],
  taskId: "40000000-0000-4000-8000-000000000001",
};

beforeEach(() => {
  vi.clearAllMocks();
  databaseExecute.mockResolvedValue({ rows: [] });
  transactionExecute
    .mockResolvedValueOnce({
      rows: [{
        config: {},
        stageDefinitionId: "50000000-0000-4000-8000-000000000001",
        stageInstanceId: "60000000-0000-4000-8000-000000000001",
        taskStatus: "IN_PROGRESS",
        taskType: "CHECKLIST",
        workflowInstanceId: "70000000-0000-4000-8000-000000000001",
        workflowVersionId: "80000000-0000-4000-8000-000000000001",
      }],
    })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] });
});

describe("workflow checklist completion repository", () => {
  it("completes an actionless checklist without executing a transition", async () => {
    const executeTransition = vi.fn();

    await expect(writeChecklistTaskCompletion(
      command,
      executeTransition,
    )).resolves.toMatchObject({
      kind: "completed",
      result: {
        actionKey: null,
        nextStageName: null,
        taskStatus: "COMPLETED",
        workflowStatus: "ACTIVE",
      },
    });
    expect(executeTransition).not.toHaveBeenCalled();
    expect(appendTaskCompletionAudit).toHaveBeenCalledOnce();
    expect(appendTaskCompletionAndActionAudit).not.toHaveBeenCalled();
  });
});
