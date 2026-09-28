export const notificationRecipientTypes = [
  "APPLICATION_OWNER",
  "ASSIGNED_USER",
  "SPECIFIC_USER",
  "SPECIFIC_ROLE",
] as const;

export type NotificationRecipientType =
  (typeof notificationRecipientTypes)[number];
