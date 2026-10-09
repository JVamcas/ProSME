import "server-only";

import { seedNotificationConfiguration } from "../infrastructure/NotificationConfigurationSeedRepository";

export async function seedInitialNotificationConfiguration() {
  const result = await seedNotificationConfiguration();
  return result;
}
