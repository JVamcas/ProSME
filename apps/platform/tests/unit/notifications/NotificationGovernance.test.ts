import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/auth/types";
import {
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  authorizeNotificationOperation,
  notificationPermissionFor,
} from "@/modules/notifications/application/NotificationAuthorization";
import {
  notificationAuditActions,
  notificationAuditMetadataSchema,
} from "@/modules/notifications/domain/NotificationAudit";

function user(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Notification administrator",
    email: "administrator@example.test",
    id: "30000000-0000-4000-8000-000000000001",
    identitySubject: "notification-administrator",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

describe("notification governance", () => {
  it("maps each operation to its narrow canonical permission", () => {
    expect(notificationPermissionFor("READ_CONFIGURATION"))
      .toBe(permissionCodes.notificationConfigurationRead);
    expect(notificationPermissionFor("UPDATE_CONFIGURATION"))
      .toBe(permissionCodes.notificationConfigurationUpdate);
    expect(notificationPermissionFor("IMPORT_TEMPLATE"))
      .toBe(permissionCodes.notificationTemplateImport);
    expect(notificationPermissionFor("PUBLISH_TEMPLATE"))
      .toBe(permissionCodes.notificationTemplatePublish);
    expect(notificationPermissionFor("READ_DELIVERY"))
      .toBe(permissionCodes.notificationDeliveryRead);
    expect(notificationPermissionFor("RETRY_DELIVERY"))
      .toBe(permissionCodes.notificationDeliveryRetry);
  });

  it("allows an explicitly granted operation and denies another operation", () => {
    const actor = user([permissionCodes.notificationConfigurationRead]);
    expect(authorizeNotificationOperation(actor, "READ_CONFIGURATION")).toBe(actor);
    expect(() => authorizeNotificationOperation(actor, "UPDATE_CONFIGURATION"))
      .toThrow(PermissionDeniedError);
  });

  it("defines an audit action for every planned configuration mutation", () => {
    expect(notificationAuditActions).toEqual(expect.arrayContaining([
      "NOTIFICATION_CHANNEL_UPDATED",
      "NOTIFICATION_EVENT_UPDATED",
      "NOTIFICATION_EVENT_RULE_UPDATED",
      "NOTIFICATION_TEMPLATE_IMPORTED",
      "NOTIFICATION_TEMPLATE_PUBLISHED",
      "NOTIFICATION_DELIVERY_RETRY_REQUESTED",
    ]));
  });

  it("rejects secrets and rendered bodies from audit metadata", () => {
    const safe = {
      correlationId: "notification-change:1",
      eventKey: "application.submitted",
    };
    expect(notificationAuditMetadataSchema.parse(safe)).toEqual(safe);
    expect(notificationAuditMetadataSchema.safeParse({
      ...safe,
      smtpPassword: "secret",
    }).success).toBe(false);
    expect(notificationAuditMetadataSchema.safeParse({
      ...safe,
      renderedBody: "<p>Applicant data</p>",
    }).success).toBe(false);
  });
});

