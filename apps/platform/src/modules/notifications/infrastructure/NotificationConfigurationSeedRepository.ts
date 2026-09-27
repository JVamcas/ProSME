import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  notificationChannels,
  notificationEventRules,
  notificationEvents,
} from "./notification.schema";
import {
  emailNotificationChannelSeed,
  notificationEventSeeds,
} from "../domain/NotificationSeedConfiguration";

export type NotificationConfigurationSeedResult = {
  createdChannel: boolean;
  createdEventKeys: string[];
  createdRuleCount: number;
};

export async function seedNotificationConfiguration(): Promise<
  NotificationConfigurationSeedResult
> {
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

    const insertedEvents = await transaction
      .insert(notificationEvents)
      .values(notificationEventSeeds.map((event) => ({
        description: event.description,
        displayName: event.displayName,
        eventKey: event.key,
        id: event.id,
        isEnabled: true,
      })))
      .onConflictDoNothing({ target: notificationEvents.eventKey })
      .returning({ eventKey: notificationEvents.eventKey });
    const events = await transaction
      .select({ eventKey: notificationEvents.eventKey, id: notificationEvents.id })
      .from(notificationEvents)
      .where(inArray(
        notificationEvents.eventKey,
        notificationEventSeeds.map((event) => event.key),
      ));
    const eventIds = new Map(events.map((event) => [event.eventKey, event.id]));
    const ruleValues = notificationEventSeeds.map((event) => {
      const eventId = eventIds.get(event.key);
      if (!eventId) {
        throw new Error(`The ${event.key} notification event could not be resolved.`);
      }
      return {
        channelId: channel.id,
        eventId,
        id: event.ruleId,
        isEnabled: true,
        isRequired: true,
        recipientType: event.recipientType,
      };
    });
    const insertedRules = await transaction
      .insert(notificationEventRules)
      .values(ruleValues)
      .onConflictDoNothing({
        target: [
          notificationEventRules.eventId,
          notificationEventRules.channelId,
          notificationEventRules.recipientType,
        ],
      })
      .returning({ id: notificationEventRules.id });

    return {
      createdChannel: insertedChannels.length === 1,
      createdEventKeys: insertedEvents.map((event) => event.eventKey),
      createdRuleCount: insertedRules.length,
    };
  });
}

