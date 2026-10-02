import { describe, expect, it } from "vitest";

import { notificationDeliveryStatusLabel, notificationDeliveryFailureMessage } from "@/modules/notifications/domain/NotificationDeliveryMessages";
import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import { notificationTemplateTargetSeeds } from "@/modules/notifications/domain/NotificationSeedConfiguration";
import { workflowDeadlineTemplateSeeds } from "@/modules/notifications/domain/WorkflowDeadlineNotificationSeed";

describe("notification delivery messages", () => {
  it.each([
    ["PENDING", "Waiting to send"],
    ["PROCESSING", "Sending"],
    ["SENT", "Sent"],
    ["FAILED", "Could not send"],
    ["DEAD_LETTER", "Needs attention"],
    ["UNKNOWN", "Unknown status"],
    ["toString", "Unknown status"],
  ])("labels delivery status %s", (status, label) => {
    expect(notificationDeliveryStatusLabel(status)).toBe(label);
  });

  it.each(Object.values(notificationErrorCodes))(
    "explains %s without exposing an internal error code",
    (code) => {
      const message = notificationDeliveryFailureMessage(code);
      expect(message.length).toBeGreaterThan(20);
      expect(message).not.toContain("NOTIFICATION_");
    },
  );

  it("explains how to resolve an unpublished template", () => {
    expect(notificationDeliveryFailureMessage(notificationErrorCodes.templateUnavailable))
      .toContain("Publish a template for this notification, then retry.");
  });

  it("uses a safe fallback for unknown codes", () => {
    expect(notificationDeliveryFailureMessage("UNKNOWN"))
      .toBe("This email could not be sent. Review the notification settings before retrying.");
    expect(notificationDeliveryFailureMessage("toString"))
      .toContain("This email could not be sent.");
  });

  it("registers an event-specific email target for each deadline notification", () => {
    for (const seed of workflowDeadlineTemplateSeeds) {
      expect(notificationTemplateTargetSeeds).toContainEqual(seed);
    }
    expect(new Set(notificationTemplateTargetSeeds.map((seed) => seed.id)).size)
      .toBe(notificationTemplateTargetSeeds.length);
  });
});
