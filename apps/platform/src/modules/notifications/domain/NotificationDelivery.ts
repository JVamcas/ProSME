export const notificationOutboxStates = [
  "PENDING",
  "PROCESSING",
  "PARTIALLY_SENT",
  "SENT",
  "FAILED",
] as const;

export const notificationDeliveryStates = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
] as const;

export type NotificationOutboxState =
  (typeof notificationOutboxStates)[number];
export type NotificationDeliveryState =
  (typeof notificationDeliveryStates)[number];

