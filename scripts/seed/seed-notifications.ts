import { seedInitialNotificationConfiguration } from "../../apps/platform/src/modules/notifications/application/ServerNotificationConfigurationSeedService";

const result = await seedInitialNotificationConfiguration();
console.info(
  `Notification seed created channel: ${result.createdChannel ? "yes" : "no"}`,
);
console.info(
  `Notification seed created events: ${result.createdEventKeys.join(", ") || "none"}`,
);
console.info(
  `Notification seed created recipient rules: ${result.createdRuleCount}`,
);
process.exit(0);

