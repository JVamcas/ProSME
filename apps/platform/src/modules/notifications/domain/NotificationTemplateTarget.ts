import {
  isNotificationEventKey,
  notificationEventCatalogue,
  type NotificationCatalogKey,
  type NotificationEventKey,
} from "./NotificationEvent";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";

export type NotificationTemplateTargetSelector =
  | { eventKey: NotificationEventKey; scope: "EVENT" }
  | { catalogKey: NotificationCatalogKey; scope: "CATALOG" }
  | { scope: "GLOBAL" };

export function notificationTemplateResolutionCandidates(
  eventKey: string,
): readonly NotificationTemplateTargetSelector[] {
  if (!isNotificationEventKey(eventKey)) {
    throw new NotificationValidationError(
      notificationErrorCodes.unknownEvent,
      `Unknown notification event: ${eventKey}`,
    );
  }
  return [
    { eventKey, scope: "EVENT" },
    {
      catalogKey: notificationEventCatalogue[eventKey].catalogKey,
      scope: "CATALOG",
    },
    { scope: "GLOBAL" },
  ];
}

