import { z } from "zod";

export const notificationAuditActions = [
  "NOTIFICATION_CHANNEL_UPDATED",
  "NOTIFICATION_CATALOG_UPDATED",
  "NOTIFICATION_EVENT_UPDATED",
  "NOTIFICATION_EVENT_RULE_UPDATED",
  "NOTIFICATION_TEMPLATE_TARGET_UPDATED",
  "NOTIFICATION_TEMPLATE_IMPORTED",
  "NOTIFICATION_TEMPLATE_PUBLISHED",
  "NOTIFICATION_DELIVERY_RETRY_REQUESTED",
] as const;

export type NotificationAuditAction =
  (typeof notificationAuditActions)[number];

export const notificationAuditMetadataSchema = z.object({
  catalogKey: z.string().trim().min(1).max(100).optional(),
  channelCode: z.string().trim().min(1).max(100).optional(),
  correlationId: z.string().trim().min(1).max(500),
  deliveryId: z.uuid().optional(),
  eventKey: z.string().trim().min(1).max(200).optional(),
  recipientType: z.string().trim().min(1).max(100).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
  templateTargetId: z.uuid().optional(),
  templateVersionId: z.uuid().optional(),
}).strict();

export type NotificationAuditMetadata = z.infer<
  typeof notificationAuditMetadataSchema
>;
