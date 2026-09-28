import { z } from "zod";

import { notificationDeliveryStates } from "../domain/NotificationDelivery";
import { notificationRecipientTypes } from "../domain/NotificationRecipient";

export const notificationCatalogKeySchema = z.string().trim().min(1).max(100);
export const notificationEventKeySchema = z.string().trim().min(1).max(200);
export const notificationDeliveryIdSchema = z.uuid();

export const notificationCatalogUpdateSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  displayName: z.string().trim().min(1).max(200),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isEnabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}).strict();

export const notificationRuleRecipientUpdateSchema = z.object({
  channelCodes: z.array(z.string().trim().min(1).max(100)).min(1),
  isRequired: z.boolean(),
  recipientType: z.enum(notificationRecipientTypes),
}).strict();

export const notificationEventRuleUpdateSchema = z.object({
  eventEnabled: z.boolean(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isEnabled: z.boolean(),
  recipients: z.array(notificationRuleRecipientUpdateSchema).min(1),
}).strict().superRefine((value, context) => {
  const recipientTypes = value.recipients.map((item) => item.recipientType);
  if (new Set(recipientTypes).size !== recipientTypes.length) {
    context.addIssue({
      code: "custom",
      message: "Recipient types must be unique.",
      path: ["recipients"],
    });
  }
});

export const notificationDeliveryQuerySchema = z.object({
  applicationReference: z.string().trim().max(100).optional(),
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
  eventKey: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  recipient: z.string().trim().max(320).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  sortField: z.enum(["createdAt", "nextAttemptAt", "status"]).default("createdAt"),
  status: z.enum(notificationDeliveryStates).optional(),
}).strict();

export const notificationDeliveryRetrySchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export type NotificationCatalogUpdate = z.infer<typeof notificationCatalogUpdateSchema>;
export type NotificationEventRuleUpdate = z.infer<typeof notificationEventRuleUpdateSchema>;
export type NotificationDeliveryQuery = z.infer<typeof notificationDeliveryQuerySchema>;

export type NotificationCatalogSummary = {
  catalogKey: string;
  description: string;
  displayName: string;
  eventCount: number;
  isEnabled: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type NotificationCatalogDetail = NotificationCatalogSummary & {
  events: Array<{
    description: string;
    displayName: string;
    eventKey: string;
    isEnabled: boolean;
  }>;
};

export type NotificationEventRuleSummary = {
  catalogKey: string;
  catalogName: string;
  eventDescription: string;
  eventKey: string;
  eventName: string;
  eventEnabled: boolean;
  isEnabled: boolean;
  recipientCount: number;
  updatedAt: string;
};

export type NotificationEventRuleDetail = NotificationEventRuleSummary & {
  channels: Array<{
    code: string;
    displayName: string;
    isEnabled: boolean;
  }>;
  recipients: Array<{
    channelCodes: string[];
    isRequired: boolean;
    recipientType: "APPLICATION_OWNER" | "ASSIGNED_USER";
  }>;
};

export type NotificationDeliveryHistoryItem = {
  applicationReference: string | null;
  attemptCount: number;
  channelCode: string;
  createdAt: string;
  deliveryId: string;
  eventKey: string;
  failureCode: string | null;
  nextAttemptAt: string;
  recipientEmail: string;
  recipientName: string;
  sentAt: string | null;
  status: string;
  templateVersionNumber: number | null;
  updatedAt: string;
};

export type NotificationOperationalSummary = {
  failed: number;
  oldestPendingAt: string | null;
  pending: number;
  processing: number;
  retrying: number;
  sent: number;
  staleLock: boolean;
};

export type NotificationDeliveryPage = {
  items: NotificationDeliveryHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
