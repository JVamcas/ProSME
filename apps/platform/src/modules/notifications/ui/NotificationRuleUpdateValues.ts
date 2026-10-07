import type {
  NotificationEventRuleDetail,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";

export function notificationRuleDetailUpdateValues(
  rule: NotificationEventRuleDetail,
): NotificationEventRuleUpdate {
  return {
    eventEnabled: rule.eventEnabled,
    isEnabled: rule.isEnabled,
    expectedUpdatedAt: rule.updatedAt,
    recipients: rule.recipients.map((recipient) => {
      const base = {
        channelCodes: recipient.channelCodes,
        isRequired: recipient.isRequired,
      };
      if (recipient.recipientType === "SPECIFIC_USER") {
        return {
          ...base,
          recipientType: "SPECIFIC_USER",
          targetId: recipient.targetId,
        };
      }
      if (recipient.recipientType === "SPECIFIC_ROLE") {
        return {
          ...base,
          recipientType: "SPECIFIC_ROLE",
          targetId: recipient.targetId,
        };
      }
      return { ...base, recipientType: recipient.recipientType };
    }),
  };
}
