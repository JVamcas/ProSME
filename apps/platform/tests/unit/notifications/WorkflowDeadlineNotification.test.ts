import { describe, expect, it } from "vitest";
import { buildNotificationRenderValues } from "@/modules/notifications/domain/NotificationTemplateFields";
import { workflowDeadlineContextSchema } from "@/modules/notifications/domain/NotificationWorkflowDeadlineEvent";

const applicationId = "00000000-0000-4000-8000-000000000001";
const sourceId = "00000000-0000-4000-8000-000000000002";
const recipient = {
  userId: applicationId,
  displayName: "Applicant",
  email: "applicant@example.com",
};
const context = workflowDeadlineContextSchema.parse({
  applicationId,
  applicationReference: "SME-7",
  assignees: [recipient],
  correlationId: "deadline-test",
  deadlineAt: "2026-10-04T10:00:00Z",
  fundingOpportunityTitle: "Growth Fund",
  kind: "RFI_REMINDER",
  occurredAt: "2026-10-03T10:00:00Z",
  owner: recipient,
  question: "Please provide the missing document.",
  scheduledFor: "2026-10-03T10:00:00Z",
  sourceId,
  sourceIdempotencyKey: "rfi-reminder-test",
  stageInstanceId: applicationId,
  stageName: "Eligibility screening",
  workflowInstanceId: applicationId,
});

describe("workflow deadline notification values", () => {
  it("links the applicant to the specific information request and includes its deadline", () => {
    const values = buildNotificationRenderValues({
      context,
      eventKey: "workflow.information-request.reminder",
      publicApplicationUrl: "https://fund.example.com",
      recipient,
    });
    expect(values.informationRequestUrl).toBe(
      `https://fund.example.com/portal/applications/${applicationId}/requests/${sourceId}`,
    );
    expect(values.question).toBe(context.question);
    expect(values.deadlineAt).toContain("2026");
  });

  it("provides staff and application links without an RFI link for a resumed deferral", () => {
    const values = buildNotificationRenderValues({
      context: { ...context, kind: "DEFERRAL_RESUMED", question: null, deadlineAt: null },
      eventKey: "workflow.deferral.resumed",
      publicApplicationUrl: "https://fund.example.com",
      recipient,
    });
    expect(values.workQueueUrl).toBe("https://fund.example.com/admin/work-queue");
    expect(values.applicationUrl).toContain(applicationId);
    expect(values.informationRequestUrl).toBe("");
    expect(values.deadlineAt).toBe("");
  });
});
