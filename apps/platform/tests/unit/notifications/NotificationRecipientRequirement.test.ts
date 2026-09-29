import { describe, expect, it } from "vitest";

import { assertRequiredNotificationRecipients } from "@/modules/notifications/domain/NotificationRecipientRequirement";

const baseRequirement = {
  eventDisplayName: "Funding call approval requested",
  eventKey: "funding-call.approval-requested",
  recipientId: "system-administrator-recipient",
  recipientTargetLabel: "System Administrator",
  recipientType: "SPECIFIC_ROLE",
  required: true,
};

describe("required notification recipients", () => {
  it("reports the event and role when every role member is excluded", () => {
    expect(() =>
      assertRequiredNotificationRecipients(
        [{ ...baseRequirement, candidateUserIds: ["submitter-id"] }],
        new Set(["submitter-id"]),
      )
    ).toThrow(
      'Notification "Funding call approval requested" (funding-call.approval-requested) cannot be sent. All active users assigned to role "System Administrator" are excluded from this notification',
    );
  });

  it("accepts a role when another expanded member remains eligible", () => {
    expect(() =>
      assertRequiredNotificationRecipients(
        [
          { ...baseRequirement, candidateUserIds: ["submitter-id"] },
          { ...baseRequirement, candidateUserIds: ["approver-id"] },
        ],
        new Set(["submitter-id"]),
      )
    ).not.toThrow();
  });

  it("reports when a required role has no active members", () => {
    expect(() =>
      assertRequiredNotificationRecipients(
        [{ ...baseRequirement, candidateUserIds: [] }],
        new Set(),
      )
    ).toThrow(
      'No active user is assigned to the required role "System Administrator".',
    );
  });
});
