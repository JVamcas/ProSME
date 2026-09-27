import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import {
  permissionCodes,
  type StaticPermissionCode,
} from "@/auth/authorization/permissions";

export const notificationOperations = [
  "READ_CONFIGURATION",
  "UPDATE_CONFIGURATION",
  "IMPORT_TEMPLATE",
  "PUBLISH_TEMPLATE",
  "READ_DELIVERY",
  "RETRY_DELIVERY",
] as const;

export type NotificationOperation = (typeof notificationOperations)[number];

const permissionByOperation: Record<
  NotificationOperation,
  StaticPermissionCode
> = {
  IMPORT_TEMPLATE: permissionCodes.notificationTemplateImport,
  PUBLISH_TEMPLATE: permissionCodes.notificationTemplatePublish,
  READ_CONFIGURATION: permissionCodes.notificationConfigurationRead,
  READ_DELIVERY: permissionCodes.notificationDeliveryRead,
  RETRY_DELIVERY: permissionCodes.notificationDeliveryRetry,
  UPDATE_CONFIGURATION: permissionCodes.notificationConfigurationUpdate,
};

export function authorizeNotificationOperation(
  user: AuthenticatedUser | null,
  operation: NotificationOperation,
) {
  return requirePermission(user, permissionByOperation[operation]);
}

export function notificationPermissionFor(
  operation: NotificationOperation,
): StaticPermissionCode {
  return permissionByOperation[operation];
}

