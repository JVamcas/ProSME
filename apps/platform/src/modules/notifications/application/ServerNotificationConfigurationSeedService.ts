import "server-only";

import { assertRecipientCompatibility } from "../domain/NotificationEvent";
import { notificationEventSeeds } from "../domain/NotificationSeedConfiguration";
import { seedNotificationConfiguration } from "../infrastructure/NotificationConfigurationSeedRepository";

export async function seedInitialNotificationConfiguration() {
  for (const event of notificationEventSeeds) {
    assertRecipientCompatibility(event.key, event.recipientType);
  }
  return seedNotificationConfiguration();
}

