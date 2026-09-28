import type { NotificationRecipientType } from "../domain/NotificationRecipient";

const recipientLabels: Record<NotificationRecipientType, string> = {
  APPLICATION_OWNER: "Applicant",
  ASSIGNED_USER: "Assigned user",
  SPECIFIC_ROLE: "Specific role",
  SPECIFIC_USER: "Specific user",
};

export function notificationRecipientLabel(type: NotificationRecipientType) {
  return recipientLabels[type];
}
