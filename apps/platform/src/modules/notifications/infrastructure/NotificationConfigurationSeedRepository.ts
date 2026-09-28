import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  notificationCatalogs,
  notificationChannels,
  notificationEvents,
  notificationTemplateTargets,
} from "./notification.schema";
import {
  notificationEventRuleChannels,
  notificationEventRuleRecipients,
  notificationEventRules,
} from "./notification-rule.schema";
import {
  emailNotificationChannelSeed,
  notificationCatalogSeeds,
  notificationEventSeeds,
  notificationTemplateTargetSeeds,
} from "../domain/NotificationSeedConfiguration";

export type NotificationConfigurationSeedResult = {
  createdCatalogKeys: string[];
  createdChannel: boolean;
  createdEventKeys: string[];
  createdRuleChannelCount: number;
  createdRuleCount: number;
  createdRuleRecipientCount: number;
  createdTargetCount: number;
};

function resolveRequiredId(
  ids: ReadonlyMap<string, string>,
  key: string,
  resourceName: string,
): string {
  const id = ids.get(key);
  if (!id) {
    throw new Error(`The ${resourceName} could not be resolved.`);
  }
  return id;
}

function buildRuleChannelSeedValues(
  eventIds: ReadonlyMap<string, string>,
  ruleIds: ReadonlyMap<string, string>,
  recipientIds: ReadonlyMap<string, string>,
  channelId: string,
) {
  return notificationEventSeeds.flatMap((event) => {
    if (!event.recipientType) return [];
    const eventId = resolveRequiredId(eventIds, event.key, event.key);
    const ruleId = resolveRequiredId(ruleIds, eventId, event.key);
    const ruleRecipientId = resolveRequiredId(
      recipientIds,
      ruleId,
      `${event.key} notification rule recipient`,
    );
    return [{
      channelId,
      id: event.ruleChannelId,
      ruleRecipientId,
    }];
  });
}

function buildTemplateTargetSeedValues(
  catalogIds: ReadonlyMap<string, string>,
  eventIds: ReadonlyMap<string, string>,
  channelId: string,
) {
  return notificationTemplateTargetSeeds.map((target) => ({
    catalogId: target.catalogKey
      ? resolveRequiredId(catalogIds, target.catalogKey, target.catalogKey)
      : null,
    channelId,
    defaultSubjectTemplate: target.defaultSubjectTemplate,
    eventId: target.eventKey
      ? resolveRequiredId(eventIds, target.eventKey, target.eventKey)
      : null,
    id: target.id,
    isEnabled: true,
    scope: target.scope,
  }));
}

export async function seedNotificationConfiguration(): Promise<NotificationConfigurationSeedResult> {
  return getDatabase().transaction(async (transaction) => {
    const insertedChannels = await transaction
      .insert(notificationChannels)
      .values(emailNotificationChannelSeed)
      .onConflictDoNothing({ target: notificationChannels.code })
      .returning({ id: notificationChannels.id });
    const [channel] = await transaction
      .select({ id: notificationChannels.id })
      .from(notificationChannels)
      .where(eq(notificationChannels.code, emailNotificationChannelSeed.code))
      .limit(1);
    if (!channel) {
      throw new Error("The EMAIL notification channel could not be resolved.");
    }

    const insertedCatalogs = await transaction
      .insert(notificationCatalogs)
      .values(
        notificationCatalogSeeds.map((catalog) => ({
          catalogKey: catalog.key,
          description: catalog.description,
          displayName: catalog.displayName,
          id: catalog.id,
          isEnabled: true,
          sortOrder: catalog.sortOrder,
        })),
      )
      .onConflictDoNothing({ target: notificationCatalogs.catalogKey })
      .returning({ catalogKey: notificationCatalogs.catalogKey });
    const catalogs = await transaction
      .select({
        catalogKey: notificationCatalogs.catalogKey,
        id: notificationCatalogs.id,
      })
      .from(notificationCatalogs)
      .where(
        inArray(
          notificationCatalogs.catalogKey,
          notificationCatalogSeeds.map((catalog) => catalog.key),
        ),
      );
    const catalogIds = new Map(
      catalogs.map((catalog) => [catalog.catalogKey, catalog.id]),
    );
    const insertedEvents = await transaction
      .insert(notificationEvents)
      .values(
        notificationEventSeeds.map((event) => {
          const catalogId = resolveRequiredId(
            catalogIds,
            event.catalogKey,
            `${event.catalogKey} notification catalog`,
          );
          return {
            catalogId,
            description: event.description,
            displayName: event.displayName,
            eventKey: event.key,
            id: event.id,
            isEnabled: true,
          };
        }),
      )
      .onConflictDoNothing({ target: notificationEvents.eventKey })
      .returning({ eventKey: notificationEvents.eventKey });
    const events = await transaction
      .select({
        eventKey: notificationEvents.eventKey,
        id: notificationEvents.id,
      })
      .from(notificationEvents)
      .where(
        inArray(
          notificationEvents.eventKey,
          notificationEventSeeds.map((event) => event.key),
        ),
      );
    const eventIds = new Map(events.map((event) => [event.eventKey, event.id]));
    const ruleValues = notificationEventSeeds.map((event) => {
      const eventId = resolveRequiredId(
        eventIds,
        event.key,
        `${event.key} notification event`,
      );
      return {
        description: event.description,
        eventId,
        id: event.ruleId,
        isEnabled: true,
      };
    });
    const insertedRules = await transaction
      .insert(notificationEventRules)
      .values(ruleValues)
      .onConflictDoNothing({
        target: notificationEventRules.eventId,
      })
      .returning({ id: notificationEventRules.id });
    const rules = await transaction
      .select({
        eventId: notificationEventRules.eventId,
        id: notificationEventRules.id,
      })
      .from(notificationEventRules)
      .where(inArray(notificationEventRules.eventId, [...eventIds.values()]));
    const ruleIds = new Map(rules.map((rule) => [rule.eventId, rule.id]));
    const recipientValues = notificationEventSeeds.flatMap((event) => {
      if (!event.recipientType) return [];
      const eventId = resolveRequiredId(eventIds, event.key, event.key);
      const ruleId = resolveRequiredId(
        ruleIds,
        eventId,
        `${event.key} notification rule`,
      );
      return [{
        id: event.ruleRecipientId,
        isRequired: true,
        recipientType: event.recipientType,
        ruleId,
      }];
    });
    const insertedRecipients = await transaction
      .insert(notificationEventRuleRecipients)
      .values(recipientValues)
      .onConflictDoNothing({
        target: [
          notificationEventRuleRecipients.ruleId,
          notificationEventRuleRecipients.recipientType,
        ],
        where: sql`${notificationEventRuleRecipients.recipientType} in ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER')`,
      })
      .returning({ id: notificationEventRuleRecipients.id });
    const recipients = await transaction
      .select({
        id: notificationEventRuleRecipients.id,
        ruleId: notificationEventRuleRecipients.ruleId,
      })
      .from(notificationEventRuleRecipients)
      .where(
        inArray(notificationEventRuleRecipients.ruleId, [...ruleIds.values()]),
      );
    const recipientIds = new Map(
      recipients.map((recipient) => [recipient.ruleId, recipient.id]),
    );
    const insertedRuleChannels = await transaction
      .insert(notificationEventRuleChannels)
      .values(
        buildRuleChannelSeedValues(eventIds, ruleIds, recipientIds, channel.id),
      )
      .onConflictDoNothing({
        target: [
          notificationEventRuleChannels.ruleRecipientId,
          notificationEventRuleChannels.channelId,
        ],
      })
      .returning({ id: notificationEventRuleChannels.id });

    const insertedTargets = await transaction
      .insert(notificationTemplateTargets)
      .values(buildTemplateTargetSeedValues(catalogIds, eventIds, channel.id))
      .onConflictDoNothing()
      .returning({ id: notificationTemplateTargets.id });

    return {
      createdCatalogKeys: insertedCatalogs.map((catalog) => catalog.catalogKey),
      createdChannel: insertedChannels.length === 1,
      createdEventKeys: insertedEvents.map((event) => event.eventKey),
      createdRuleChannelCount: insertedRuleChannels.length,
      createdRuleCount: insertedRules.length,
      createdRuleRecipientCount: insertedRecipients.length,
      createdTargetCount: insertedTargets.length,
    };
  });
}
