export const notificationChannelTypes = ["EMAIL"] as const;
export const notificationTemplateStates = [
  "DRAFT",
  "PUBLISHED",
  "RETIRED",
] as const;

export type NotificationChannelType =
  (typeof notificationChannelTypes)[number];
export type NotificationTemplateState =
  (typeof notificationTemplateStates)[number];

