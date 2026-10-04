import type { NotificationRecipientType } from "../domain/NotificationRecipient";

const recipientLabels: Record<NotificationRecipientType, string> = {
  APPLICATION_OWNER: "Applicant",
  ACTION_ACTOR: "Person who performed the action",
  ASSIGNED_USER: "Assigned user",
  FUNDING_CALL_STAKEHOLDER: "Funding call stakeholder",
  SPECIFIC_ROLE: "Specific role",
  SPECIFIC_USER: "Specific user",
};

export function notificationRecipientLabel(type: NotificationRecipientType) {
  return recipientLabels[type];
}
