import "server-only";

import { getServerEnvironment } from "@/lib/env/server";
import type {
  NotificationEventContextByKey,
  NotificationEventKey,
} from "../domain/NotificationEvent";
import {
  buildNotificationRenderValues,
  type NotificationRenderRecipient,
} from "../domain/NotificationTemplateFields";
import { notificationBrandingLogoUrl } from "./ServerNotificationEmailBranding";

export function buildServerNotificationRenderValues<
  Key extends NotificationEventKey,
>(input: {
  context: NotificationEventContextByKey[Key];
  eventKey: Key;
  recipient: NotificationRenderRecipient;
}) {
  return {
    ...buildNotificationRenderValues({
      ...input,
      publicApplicationUrl: getServerEnvironment().APP_PUBLIC_URL,
    }),
    brandingLogoUrl: notificationBrandingLogoUrl,
  };
}
