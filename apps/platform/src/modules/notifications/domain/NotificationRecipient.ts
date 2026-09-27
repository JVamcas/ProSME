export const notificationRecipientTypes = [
  "APPLICATION_OWNER",
  "ASSIGNED_USER",
] as const;

export type NotificationRecipientType =
  (typeof notificationRecipientTypes)[number];

