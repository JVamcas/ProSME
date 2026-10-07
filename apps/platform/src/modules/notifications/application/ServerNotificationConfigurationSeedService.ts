import "server-only";

import { seedWebsiteReportEmailTemplates } from "../infrastructure/WebsiteReportNotificationSeedRepository";
import { seedNotificationConfiguration } from "../infrastructure/NotificationConfigurationSeedRepository";

export async function seedInitialNotificationConfiguration() {
  const result = await seedNotificationConfiguration();
  await seedWebsiteReportEmailTemplates();
  return result;
}
