import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

export const notificationPermissionCatalogue: readonly PermissionDefinition[] = [
  {
    code: permissionCodes.notificationConfigurationRead,
    description: "Read notification channels, events, and recipient rules.",
    label: "Read notification configuration",
  },
  {
    code: permissionCodes.notificationConfigurationUpdate,
    description: "Update notification channels, events, and recipient rules.",
    label: "Update notification configuration",
  },
  {
    code: permissionCodes.notificationTemplateImport,
    description: "Import notification template drafts.",
    label: "Import notification templates",
  },
  {
    code: permissionCodes.notificationTemplatePublish,
    description: "Publish validated notification template versions.",
    label: "Publish notification templates",
  },
  {
    code: permissionCodes.notificationDeliveryRead,
    description: "Read notification delivery history and recipient details.",
    label: "Read notification deliveries",
  },
  {
    code: permissionCodes.notificationDeliveryRetry,
    description: "Retry failed notification deliveries.",
    label: "Retry notification deliveries",
  },
];

