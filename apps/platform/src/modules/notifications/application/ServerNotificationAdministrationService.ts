import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  notificationCatalogUpdateSchema,
  notificationDeliveryQuerySchema,
  notificationDeliveryRetrySchema,
  notificationEventRuleUpdateSchema,
  notificationEventRuleListQuerySchema,
  type NotificationCatalogUpdate,
  type NotificationDeliveryQuery,
  type NotificationEventRuleUpdate,
  type NotificationEventRuleListQuery,
} from "../api/NotificationAdministrationSchemas";
import { notificationAuditMetadataSchema } from "../domain/NotificationAudit";
import {
  findNotificationCatalogRecord,
  findNotificationEventRuleRecord,
  listNotificationCatalogRecords,
  listNotificationEventRuleRecords,
  updateNotificationCatalogRecord,
  updateNotificationEventRuleRecord,
} from "../infrastructure/NotificationAdministrationRepository";
import {
  getNotificationOperationalSummaryRecord,
  listNotificationDeliveryRecords,
  retryNotificationDeliveryRecord,
} from "../infrastructure/NotificationDeliveryAdministrationRepository";
import { getNotificationProcessorConfiguration } from "./NotificationProcessorConfiguration";
import { authorizeNotificationOperation } from "./NotificationAuthorization";

import {
  isNotificationEventKey,
  notificationEventCatalogue,
} from "../domain/NotificationEvent";
import {
  isRelationshipNotificationRecipientType,
  relationshipRecipientTypesForEvent,
} from "../domain/NotificationRecipient";

function assertConfigurableEvent(eventKey: string) {
  if (
    isNotificationEventKey(eventKey) &&
    notificationEventCatalogue[eventKey].ruleEligibility === "SYSTEM_ONLY"
  ) {
    throw new ResourceConflictError(
      "System-only events cannot have notification rules.",
    );
  }
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getNotificationCatalogs(user: AuthenticatedUser | null) {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  return serialize(await listNotificationCatalogRecords());
}

export async function getNotificationCatalog(
  user: AuthenticatedUser | null,
  catalogKey: string,
) {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const catalog = await findNotificationCatalogRecord(catalogKey);
  if (!catalog) throw new ResourceNotFoundError("notification catalog");
  return serialize(catalog);
}

export async function updateNotificationCatalog(
  user: AuthenticatedUser | null,
  catalogKey: string,
  input: NotificationCatalogUpdate,
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "UPDATE_CONFIGURATION");
  const update = notificationCatalogUpdateSchema.parse(input);
  notificationAuditMetadataSchema.parse({ catalogKey, correlationId });
  const result = await updateNotificationCatalogRecord({
    actorId: actor.id,
    catalogKey,
    correlationId,
    update,
  });
  if (!result) {
    const existing = await findNotificationCatalogRecord(catalogKey);
    if (!existing) throw new ResourceNotFoundError("notification catalog");
    throw new ResourceConflictError(
      "The notification catalog changed while you were editing it. Refresh and try again.",
    );
  }
  const catalog = await findNotificationCatalogRecord(catalogKey);
  if (!catalog) throw new ResourceNotFoundError("notification catalog");
  return serialize(catalog);
}

export async function getNotificationEventRules(
  user: AuthenticatedUser | null,
  input: NotificationEventRuleListQuery = {},
) {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const query = notificationEventRuleListQuerySchema.parse(input);
  return serialize(await listNotificationEventRuleRecords(query));
}

export async function getNotificationEventRule(
  user: AuthenticatedUser | null,
  eventKey: string,
) {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  assertConfigurableEvent(eventKey);
  const rule = await findNotificationEventRuleRecord(eventKey);
  if (!rule) throw new ResourceNotFoundError("notification event rule");
  return serialize(rule);
}

export async function updateNotificationEventRule(
  user: AuthenticatedUser | null,
  eventKey: string,
  input: NotificationEventRuleUpdate,
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "UPDATE_CONFIGURATION");
  assertConfigurableEvent(eventKey);
  const update = notificationEventRuleUpdateSchema.parse(input);
  const allowedRelationships = new Set(
    relationshipRecipientTypesForEvent(eventKey),
  );
  if (
    update.recipients.some(
      (recipient) =>
        isRelationshipNotificationRecipientType(recipient.recipientType)
        && !allowedRelationships.has(recipient.recipientType),
    )
  ) {
    throw new ResourceConflictError(
      "One or more recipient types are unavailable for this event. Choose a recipient supported by the event data.",
    );
  }
  const current = (await findNotificationEventRuleRecord(eventKey)) as
    | {
        channels: Array<{ code: string; isEnabled: boolean }>;
        recipientOptions: {
          roles: Array<{ id: string }>;
          users: Array<{ id: string }>;
        };
      }
    | undefined;
  if (!current) throw new ResourceNotFoundError("notification event rule");
  const enabledChannels = new Set(
    current.channels
      .filter((channel) => channel.isEnabled)
      .map((channel) => channel.code),
  );
  if (
    update.recipients.some((recipient) =>
      recipient.channelCodes.some((code) => !enabledChannels.has(code)),
    )
  ) {
    throw new ResourceConflictError(
      "Notification rules can only bind enabled channels.",
    );
  }
  const userIds = new Set(current.recipientOptions.users.map(({ id }) => id));
  const roleIds = new Set(current.recipientOptions.roles.map(({ id }) => id));
  if (
    update.recipients.some((recipient) =>
      recipient.recipientType === "SPECIFIC_USER"
        ? !userIds.has(recipient.targetId)
        : recipient.recipientType === "SPECIFIC_ROLE"
          ? !roleIds.has(recipient.targetId)
          : false,
    )
  ) {
    throw new ResourceConflictError(
      "One or more selected notification recipients are no longer available.",
    );
  }
  const result = await updateNotificationEventRuleRecord({
    actorId: actor.id,
    correlationId,
    eventKey,
    update,
  });
  if (!result) {
    throw new ResourceConflictError(
      "The notification rule changed while you were editing it. Refresh and try again.",
    );
  }
  assertConfigurableEvent(eventKey);
  const rule = await findNotificationEventRuleRecord(eventKey);
  if (!rule) throw new ResourceNotFoundError("notification event rule");
  return serialize(rule);
}

export async function getNotificationDeliveries(
  user: AuthenticatedUser | null,
  input: NotificationDeliveryQuery,
) {
  authorizeNotificationOperation(user, "READ_DELIVERY");
  const query = notificationDeliveryQuerySchema.parse(input);
  const result = await listNotificationDeliveryRecords(query);
  return {
    items: serialize(result.items),
    page: query.page,
    pageSize: query.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / query.pageSize),
  };
}

export async function retryNotificationDelivery(
  user: AuthenticatedUser | null,
  deliveryId: string,
  input: { reason: string },
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "RETRY_DELIVERY");
  const { reason } = notificationDeliveryRetrySchema.parse(input);
  notificationAuditMetadataSchema.parse({ correlationId, deliveryId, reason });
  const result = await retryNotificationDeliveryRecord({
    actorId: actor.id,
    correlationId,
    deliveryId,
    reason,
  });
  if (result.outcome === "NOT_FOUND") {
    throw new ResourceNotFoundError("notification delivery");
  }
  if (result.outcome === "INELIGIBLE") {
    throw new ResourceConflictError(
      "Only failed or dead-letter notification deliveries can be retried.",
    );
  }
  return result;
}

export async function getNotificationOperationalSummary(
  user: AuthenticatedUser | null,
) {
  authorizeNotificationOperation(user, "READ_DELIVERY");
  const { NOTIFICATION_PROCESSOR_LOCK_TIMEOUT_MS } =
    getNotificationProcessorConfiguration();
  const staleBefore = new Date(
    Date.now() - NOTIFICATION_PROCESSOR_LOCK_TIMEOUT_MS,
  );
  return serialize(await getNotificationOperationalSummaryRecord(staleBefore));
}
