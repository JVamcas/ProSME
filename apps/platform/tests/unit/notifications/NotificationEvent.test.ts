import { describe, expect, it } from "vitest";

import {
  assertRecipientCompatibility,
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
  applicationReference: "SME-2026-001",
  correlationId: "submission:SME-2026-001",
  fundingOpportunityTitle: "SME Growth Fund",
  ownerDisplayName: "Applicant One",
  ownerEmail: "applicant@example.test",
  sourceIdempotencyKey: "submission:10000000-0000-4000-8000-000000000001",
  submittedAt: "2026-09-27T08:00:00.000Z",
  workflowInstanceId: "10000000-0000-4000-8000-000000000003",
};

const taskContext = {
  applicationId: "20000000-0000-4000-8000-000000000001",
  applicationReference: "SME-2026-002",
  assignedAt: "2026-09-27T09:00:00.000Z",
  assignees: [{
    displayName: "Reviewer One",
    email: "reviewer@example.test",
    userId: "20000000-0000-4000-8000-000000000002",
  }],
  correlationId: "activation:20000000-0000-4000-8000-000000000003",
  fundingOpportunityTitle: "SME Growth Fund",
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

describe("notification event catalogue", () => {
  it("validates both initial event contexts", () => {
    expect(parseNotificationContext("application.submitted", applicationContext))
      .toEqual(applicationContext);
    expect(parseNotificationContext("workflow.task.assigned", taskContext))
      .toEqual(taskContext);
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

  it("enforces recipient compatibility from the authoritative catalogue", () => {
    expect(notificationEventCatalogue["application.submitted"].catalogKey)
      .toBe("APPLICATIONS");
    expect(notificationEventCatalogue["workflow.task.assigned"].catalogKey)
      .toBe("WORKFLOW");
    expect(notificationEventCatalogue["application.submitted"]
      .allowedRecipientTypes).toEqual(["APPLICATION_OWNER"]);
    expect(() => assertRecipientCompatibility(
      "application.submitted",
      "APPLICATION_OWNER",
    )).not.toThrow();
    expect(() => assertRecipientCompatibility(
      "application.submitted",
      "ASSIGNED_USER",
    )).toThrow(expect.objectContaining({
      code: notificationErrorCodes.incompatibleRecipient,
    }));
  });
});
