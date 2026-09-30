export const notificationOutboxStates = [
  "PENDING",
  "PROCESSING",
  "PARTIALLY_SENT",
  "SENT",
  "FAILED",
  "DEAD_LETTER",
] as const;

export const notificationDeliveryStates = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "DEAD_LETTER",
] as const;

export type NotificationOutboxState =
  (typeof notificationOutboxStates)[number];
export type NotificationDeliveryState =
  (typeof notificationDeliveryStates)[number];
