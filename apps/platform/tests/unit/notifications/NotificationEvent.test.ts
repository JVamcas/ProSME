import { describe, expect, it } from "vitest";

import {
  notificationEventCatalogue,
  parseNotificationContext,
} from "@/modules/notifications/domain/NotificationEvent";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "@/modules/notifications/domain/NotificationErrors";

const applicationContext = {
  applicationId: "10000000-0000-4000-8000-000000000001",
  applicationOwnerUserId: "10000000-0000-4000-8000-000000000002",
  applicationReference: "SME Fund-2026-001",
  correlationId: "submission:SME Fund-2026-001",
  fundingOpportunityTitle: "SME Fund Growth Fund",
  ownerDisplayName: "Applicant One",
  ownerEmail: "applicant@example.test",
  sourceIdempotencyKey: "submission:10000000-0000-4000-8000-000000000001",
  submittedAt: "2026-09-27T08:00:00.000Z",
  workflowInstanceId: "10000000-0000-4000-8000-000000000003",
};

const taskContext = {
  applicationId: "20000000-0000-4000-8000-000000000001",
  applicationReference: "SME Fund-2026-002",
  assignedAt: "2026-09-27T09:00:00.000Z",
  assignees: [{
    displayName: "Reviewer One",
    email: "reviewer@example.test",
    userId: "20000000-0000-4000-8000-000000000002",
  }],
  correlationId: "activation:20000000-0000-4000-8000-000000000003",
  fundingOpportunityTitle: "SME Fund Growth Fund",
  sourceIdempotencyKey: "activation:20000000-0000-4000-8000-000000000003",
  stageInstanceId: "20000000-0000-4000-8000-000000000003",
  stageName: "Technical review",
  tasks: [{
    assignedUserId: "20000000-0000-4000-8000-000000000002",
    taskId: "20000000-0000-4000-8000-000000000004",
    taskName: "Assess application",
  }],
  workflowInstanceId: "20000000-0000-4000-8000-000000000005",
};

const owner = {
  displayName: "Applicant One",
  email: "applicant@example.test",
  userId: "30000000-0000-4000-8000-000000000004",
};

const assignees = [{
  displayName: "Reviewer One",
  email: "reviewer@example.test",
  userId: "30000000-0000-4000-8000-000000000005",
}];

const informationRequestContext = {
  applicationId: "30000000-0000-4000-8000-000000000001",
  applicationReference: "SME Fund-2026-003",
  assignees,
  correlationId: "rfi:30000000-0000-4000-8000-000000000002",
  fundingOpportunityTitle: "SME Fund Growth Fund",
  owner,
  question: "Please provide the latest management accounts.",
  requestInformationId: "30000000-0000-4000-8000-000000000002",
  sourceIdempotencyKey: "rfi-created:30000000-0000-4000-8000-000000000002",
  workflowInstanceId: "30000000-0000-4000-8000-000000000003",
};

describe("notification event catalogue", () => {
  it("validates the application and task event contexts", () => {
    expect(parseNotificationContext("application.submitted", applicationContext))
      .toEqual(applicationContext);
    expect(parseNotificationContext("workflow.task.assigned", taskContext))
      .toEqual(taskContext);
  });

  it("validates escalation context and rejects unmatched recipients", () => {
    const context = {
      ...taskContext,
      escalationId: "20000000-0000-4000-8000-000000000006",
      reason: "Needs intervention",
      trigger: "MANUAL",
    };
    expect(parseNotificationContext("workflow.task.escalated", context)).toEqual(context);
    expect(() => parseNotificationContext("workflow.task.escalated", {
      ...context,
      assignees: [{ ...context.assignees[0], userId: context.escalationId }],
    })).toThrow("Invalid context");
  });

  it("validates all information-request lifecycle contexts", () => {
    expect(parseNotificationContext(
      "workflow.information-request.created",
      {
        ...informationRequestContext,
        createdAt: "2026-09-27T10:00:00.000Z",
        deadlineAt: "2026-10-04T10:00:00.000Z",
        owner,
      },
    )).toMatchObject(informationRequestContext);
    expect(parseNotificationContext(
      "workflow.information-request.responded",
      {
        ...informationRequestContext,
        assignees,
        respondedAt: "2026-09-29T10:00:00.000Z",
      },
    )).toMatchObject(informationRequestContext);
    expect(parseNotificationContext(
      "workflow.information-request.closed",
      {
        ...informationRequestContext,
        closedAt: "2026-09-30T10:00:00.000Z",
        owner,
      },
    )).toMatchObject(informationRequestContext);
    expect(parseNotificationContext(
      "workflow.information-request.expired",
      {
        ...informationRequestContext,
        assignees,
        deadlineAt: "2026-10-04T10:00:00.000Z",
        expiredAt: "2026-10-04T10:00:00.000Z",
      },
    )).toMatchObject(informationRequestContext);
  });

  it("returns a controlled error for invalid context", () => {
    try {
      parseNotificationContext("application.submitted", {
        ...applicationContext,
        ownerEmail: "not-an-email",
      });
      throw new Error("Expected notification context validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(NotificationValidationError);
      expect(error).toMatchObject({ code: notificationErrorCodes.invalidContext });
    }
  });

  it("rejects task contexts without the referenced assignee snapshot", () => {
    try {
      parseNotificationContext("workflow.task.assigned", {
        ...taskContext,
        tasks: [{
          ...taskContext.tasks[0],
          assignedUserId: "20000000-0000-4000-8000-000000000099",
        }],
      });
      throw new Error("Expected notification context validation to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        code: notificationErrorCodes.invalidContext,
        issues: [expect.objectContaining({
          message: "Task assignee must have a matching assignee snapshot.",
        })],
      });
    }
  });

  it("returns a controlled error for unknown events", () => {
    expect(() => parseNotificationContext("application.deleted", {})).toThrow(
      expect.objectContaining({ code: notificationErrorCodes.unknownEvent }),
    );
  });

  it("keeps event identity separate from configurable recipient rules", () => {
    expect(notificationEventCatalogue["application.submitted"].catalogKey)
      .toBe("APPLICATIONS");
    expect(notificationEventCatalogue["workflow.task.assigned"].catalogKey)
      .toBe("WORKFLOW");
    expect(notificationEventCatalogue["application.submitted"])
      .not.toHaveProperty("allowedRecipientTypes");
    expect(notificationEventCatalogue["workflow.information-request.created"])
      .not.toHaveProperty("allowedRecipientTypes");
  });
});
