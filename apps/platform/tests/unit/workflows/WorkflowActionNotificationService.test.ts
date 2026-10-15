import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/WorkflowActionNotificationRepository",
  () => ({
    loadWorkflowActionNotificationRecipients: vi.fn(),
    insertWorkflowActionNotifications: vi.fn(),
  }),
);
import {
  prepareWorkflowActionNotifications,
  captureWorkflowActionNotifications,
} from "@/modules/workflows/application/runtime/ServerWorkflowActionNotificationService";
import {
  loadWorkflowActionNotificationRecipients,
  insertWorkflowActionNotifications,
} from "@/modules/notifications/infrastructure/WorkflowActionNotificationRepository";
import { operator } from "@/modules/conditions/domain/Operator";
import { target, user, input } from "./WorkflowActionExecutionFixtures";
import type { WorkflowActionNotification } from "@/modules/workflows/domain/actions/WorkflowActionNotification";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  condition: null,
  recipientType: "APPLICATION_OWNER" as const,
  recipientId: null,
  subject: "Decision for {{fundingcalltitle}}",
  body: "<p>Hello {{recipientname}}</p>",
};
const condition: ConditionGroup = {
  id: "10000000-0000-4000-8000-000000000002",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "10000000-0000-4000-8000-000000000003",
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key: "application.status" },
      operator: operator("EQUALS"),
      rightOperand: { kind: "CONSTANT", value: "APPROVED" },
    },
  ],
};
const context = {
  application: { status: "APPROVED" },
  eligibility: {},
  fundingCall: {},
  stages: [],
};
const transaction = {} as Parameters<
  typeof prepareWorkflowActionNotifications
>[0];
function configured() {
  return {
    ...target,
    action: {
      ...target.action,
      notifications: [row] as WorkflowActionNotification[],
    },
    stage: {
      ...target.stage,
      application: { id: row.id, reference: "SME-1" },
      fundingCall: { title: "Growth" },
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadWorkflowActionNotificationRecipients).mockResolvedValue([
    {
      notificationId: row.id,
      userId: row.id,
      email: "alice@example.test",
      displayName: "Alice",
      recipientType: "APPLICATION_OWNER",
      stageName: "Assessment",
    },
  ]);
});

describe("action notification transaction orchestration", () => {
  it("skips reads and writes for actions without notification rows", async () => {
    expect(
      await prepareWorkflowActionNotifications(
        transaction,
        user(),
        target,
        context,
      ),
    ).toEqual([]);
    await captureWorkflowActionNotifications(transaction, input, row.id, []);
    expect(loadWorkflowActionNotificationRecipients).not.toHaveBeenCalled();
    expect(insertWorkflowActionNotifications).not.toHaveBeenCalled();
  });
  it("evaluates every row and resolves matching recipients once", async () => {
    const current = configured();
    current.action.notifications = [
      row,
      { ...row, id: condition.id, condition },
    ];
    vi.mocked(loadWorkflowActionNotificationRecipients).mockResolvedValue([
      {
        notificationId: row.id,
        userId: row.id,
        email: "a@example.test",
        displayName: "Alice",
        recipientType: "APPLICATION_OWNER",
        stageName: "Assessment",
      },
      {
        notificationId: condition.id,
        userId: row.id,
        email: "a@example.test",
        displayName: "Alice",
        recipientType: "APPLICATION_OWNER",
        stageName: "Assessment",
      },
    ]);
    expect(
      await prepareWorkflowActionNotifications(
        transaction,
        { ...user(), displayName: "Reviewer" },
        current,
        context,
      ),
    ).toHaveLength(2);
    const result = await prepareWorkflowActionNotifications(
      transaction,
      { ...user(), displayName: "Reviewer" },
      current,
      { ...context, application: { status: "REJECTED" } },
    );
    expect(result).toHaveLength(1);
    expect(result[0].rowId).toBe(row.id);
  });
  it("captures immutable content and occurrence keys for the action execution", async () => {
    const prepared = await prepareWorkflowActionNotifications(
      transaction,
      { ...user(), displayName: "Reviewer" },
      configured(),
      context,
    );
    await captureWorkflowActionNotifications(
      transaction,
      input,
      "execution-1",
      prepared,
    );
    expect(insertWorkflowActionNotifications).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        occurrences: [
          expect.objectContaining({
            occurrenceKey: `action:execution-1:notification:${row.id}`,
            context: expect.objectContaining({
              fundingOpportunityTitle: "Growth",
              htmlTemplate: row.body,
            }),
          }),
        ],
      }),
    );
  });
  it("fails before action mutation if no active recipient can be resolved", async () => {
    vi.mocked(loadWorkflowActionNotificationRecipients).mockResolvedValue([]);
    await expect(
      prepareWorkflowActionNotifications(
        transaction,
        { ...user(), displayName: "Reviewer" },
        configured(),
        context,
      ),
    ).rejects.toThrow("No active recipient");
    expect(insertWorkflowActionNotifications).not.toHaveBeenCalled();
  });
});
