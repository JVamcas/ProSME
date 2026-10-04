import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationTerminalStatusRepository", () => ({
  readApplicationTerminalStatusContext: vi.fn(),
  recordApplicationTerminalStatusEvent: vi.fn(),
}));
vi.mock("@/modules/notifications/infrastructure/NotificationOccurrenceRepository", () => ({
  insertNotificationOccurrence: vi.fn(),
}));

import { captureApplicationTerminalStatus } from "@/modules/applications/application/ServerApplicationTerminalStatusService";
import {
  readApplicationTerminalStatusContext,
  recordApplicationTerminalStatusEvent,
} from "@/modules/applications/infrastructure/ApplicationTerminalStatusRepository";
import { insertNotificationOccurrence } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";
import { projectApplicantStatus } from "@/modules/applications/domain/ApplicantStatusProjection";

const applicationId = "10000000-0000-4000-8000-000000000001";
const owner = {
  displayName: "Applicant",
  email: "Applicant@example.test",
  userId: "10000000-0000-4000-8000-000000000002",
};
const input = {
  actorId: "10000000-0000-4000-8000-000000000003",
  correlationId: "screening-1",
  failedRuleIds: ["10000000-0000-4000-8000-000000000004"],
  newStatus: "INELIGIBLE",
  occurredAt: new Date("2026-10-02T08:00:00Z"),
  reasonCodes: ["NOT_REGISTERED"],
  sourceIdempotencyKey: "eligibility:evaluation-1",
  statusLabel: "Ineligible",
  workflowInstanceId: "10000000-0000-4000-8000-000000000005",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readApplicationTerminalStatusContext).mockResolvedValue({
    applicationId, applicationReference: "SME-2026-1",
    fundingOpportunityTitle: "Growth Fund", owner,
    previousPublicStatus: { status: "UNDER_REVIEW", label: "Under review", description: "" },
  });
  vi.mocked(insertNotificationOccurrence).mockResolvedValue({
    created: true, deliveryCount: 1,
    id: "10000000-0000-4000-8000-000000000006", status: "PENDING",
  });
});

describe("application terminal status notification and audit", () => {
  it("captures applicant, failure evidence and previous/new status in the same transaction", async () => {
    const transaction = {} as never;
    await captureApplicationTerminalStatus(transaction, input);
    expect(insertNotificationOccurrence).toHaveBeenCalledWith(transaction,
      expect.objectContaining({
        aggregateId: applicationId,
        eventKey: "application.terminal-status-reached",
        occurrenceKey: `terminal-status:${input.workflowInstanceId}:${input.sourceIdempotencyKey}`,
        context: expect.objectContaining({
          failedRuleIds: input.failedRuleIds, newStatus: "INELIGIBLE",
          previousStatus: "UNDER_REVIEW", reasonCodes: input.reasonCodes,
          owner, occurredAt: input.occurredAt.toISOString(),
        }),
        recipients: [expect.objectContaining({
          recipientType: "APPLICATION_OWNER", userId: owner.userId,
          normalizedEmail: "applicant@example.test",
        })],
      }));
    expect(recordApplicationTerminalStatusEvent).toHaveBeenCalledWith(transaction,
      expect.objectContaining({ context: expect.objectContaining({ newStatus: "INELIGIBLE" }) }));
  });

  it("does not append another event or audit record when the occurrence already exists", async () => {
    vi.mocked(insertNotificationOccurrence).mockResolvedValue({
      created: false, deliveryCount: 1,
      id: "10000000-0000-4000-8000-000000000006", status: "PENDING",
    });
    await captureApplicationTerminalStatus({} as never, input);
    expect(recordApplicationTerminalStatusEvent).not.toHaveBeenCalled();
  });

  it.each(["INELIGIBLE", "REJECTED", "REJECTED_INCOMPLETE"] as const)(
    "shows the selected %s status directly to the applicant", (status) => {
      expect(projectApplicantStatus({
        lifecycleStatus: "submitted", workflowStatus: "REJECTED",
        terminalPublicStatus: { status, label: status, description: "Decision" },
        activeStageStatuses: [], hasOpenRfi: false,
      })).toMatchObject({ status, label: status, actionRequired: false });
    },
  );
});
