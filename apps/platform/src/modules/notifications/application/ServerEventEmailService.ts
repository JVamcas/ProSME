import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerEnvironment } from "@/lib/env/server";
import {
  eventEmailContextSchema,
  eventEmailFields,
} from "../domain/NotificationEventRegistration";
import type { ClaimedNotificationDelivery } from "../infrastructure/NotificationDispatchRepository";
import { renderNotificationTemplate } from "./NotificationTemplateRenderer";
import { notificationBrandingLogoUrl } from "./ServerNotificationEmailBranding";
import {
  prepareEventEmailDeliveries as prepareDeliveries,
  withCurrentEventDelivery,
} from "../infrastructure/EventEmailDeliveryRepository";

export async function prepareEventEmailDeliveries(batchSize: number) {
  return prepareDeliveries(batchSize);
}

export async function renderEventEmail(delivery: ClaimedNotificationDelivery) {
  const context = eventEmailContextSchema.parse(delivery.context);
  const reminder = delivery.eventKey === "event.registration.reminder";
  const htmlTemplate =
    delivery.htmlTemplate ||
    (await readFile(
      path.join(
        process.cwd(),
        "src/modules/notifications/templates/email",
        reminder
          ? "event-registration-reminder.html"
          : "event-registration-confirmed.html",
      ),
      "utf8",
    ));
  const eventTime = new Intl.DateTimeFormat("en-NA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: context.timezone,
  }).format(new Date(context.startsAt));
  const baseUrl = getServerEnvironment().APP_PUBLIC_URL;
  if (!baseUrl)
    throw new Error("Public application URL is required for event emails.");
  return renderNotificationTemplate(
    {
      htmlTemplate,
      subjectTemplate:
        delivery.subjectTemplate ||
        `${reminder ? "Reminder" : "Registration confirmed"}: {{eventTitle}}`,
      plainTextTemplate:
        delivery.plainTextTemplate ||
        "Hello {{recipientName}},\n{{eventTitle}}\n{{eventTime}}\n{{eventLocation}}\n{{eventUrl}}",
    },
    eventEmailFields,
    {
      platformName: "SME Fund Namibia",
      recipientName: delivery.recipientName,
      brandingLogoUrl: notificationBrandingLogoUrl,
      eventTitle: context.title,
      eventTime: `${eventTime} (${context.timezone})`,
      eventLocation: context.location,
      eventUrl: new URL(
        `/events/${encodeURIComponent(context.slug)}`,
        baseUrl,
      ).toString(),
    },
  );
}

export async function dispatchCurrentEventEmail<T>(
  delivery: ClaimedNotificationDelivery,
  operation: () => Promise<T>,
): Promise<T | null> {
  return withCurrentEventDelivery(delivery.outboxId, operation);
}
