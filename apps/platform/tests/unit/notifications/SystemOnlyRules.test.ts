import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/NotificationAdministrationRepository",
  () => ({
    findNotificationEventRuleRecord: vi.fn(),
    updateNotificationEventRuleRecord: vi.fn(),
  }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  getNotificationEventRule,
  updateNotificationEventRule,
} from "@/modules/notifications/application/ServerNotificationAdministrationService";
import {
  findNotificationEventRuleRecord,
  updateNotificationEventRuleRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";

const user: AuthenticatedUser = {
  id: "80000000-0000-4000-8000-000000000001",
  identitySubject: "operator",
  email: "operator@example.com",
  displayName: "Operator",
  status: "active",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roleCodes: new Set(),
  capabilities: new Set([
    permissionCodes.notificationConfigurationRead,
    permissionCodes.notificationConfigurationUpdate,
  ]),
};

describe("system-only notification rule policy", () => {
  it("rejects system-only rule edits before loading recipient options or writing", async () => {
    await expect(
      updateNotificationEventRule(
        user,
        "auth.password.reset",
        {
          eventEnabled: false,
          isEnabled: false,
          expectedUpdatedAt: "2026-09-29T10:00:00.000Z",
          recipients: [
            {
              channelCodes: ["EMAIL"],
              isRequired: true,
              recipientType: "APPLICATION_OWNER",
            },
          ],
        },
        "test",
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findNotificationEventRuleRecord).not.toHaveBeenCalled();
    expect(updateNotificationEventRuleRecord).not.toHaveBeenCalled();
  });
  it("rejects direct system-only rule reads", async () => {
    await expect(
      getNotificationEventRule(user, "auth.email.verification"),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(findNotificationEventRuleRecord).not.toHaveBeenCalled();
  });
});
