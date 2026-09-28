import "server-only";

import { seedNotificationConfiguration } from "../infrastructure/NotificationConfigurationSeedRepository";

export async function seedInitialNotificationConfiguration() {
  return seedNotificationConfiguration();
}
