import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/NotificationAdministrationRepository",
  () => ({ updateNotificationChannelRecord: vi.fn() }),
);
vi.mock(
  "@/modules/notifications/infrastructure/NotificationTemplateRepository",
  () => ({
    findNotificationChannel: vi.fn(),
    listNotificationTemplateTargets: vi.fn(),
  }),
);

import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  getNotificationChannel,
  updateNotificationChannel,
} from "@/modules/notifications/application/ServerNotificationTemplateService";
import { updateNotificationChannelRecord } from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
import {
  findNotificationChannel,
  listNotificationTemplateTargets,
} from "@/modules/notifications/infrastructure/NotificationTemplateRepository";

function user(permissions: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(permissions),
    createdAt: new Date(),
    displayName: "Operator",
    email: "operator@example.com",
    id: "80000000-0000-4000-8000-000000000001",
    identitySubject: "firebase-operator",
    lastLoginAt: null,
    roleCodes: new Set(["OPERATIONS"]),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const update = {
  expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
  isEnabled: false,
  sortOrder: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notification channel service", () => {
  it("returns presentation data for catalog and event template targets", async () => {
    vi.mocked(findNotificationChannel).mockResolvedValue({
      channelType: "EMAIL",
      code: "EMAIL",
      displayName: "Email",
      isEnabled: true,
      sortOrder: 10,
      targetCount: 1,
      updatedAt: "2026-09-28T10:00:00.123456Z",
    });
    vi.mocked(listNotificationTemplateTargets).mockResolvedValue([{
      catalogKey: "WORKFLOW",
      catalogName: "Workflow",
      defaultSubjectTemplate: "Workflow update for application {{applicationReference}}",
      description: "Workflow runtime notification events.",
      displayName: null,
      eventKey: null,
      id: "00000000-0000-4000-8000-000000000503",
      isEnabled: true,
      lastVersionCreatedAt: new Date("2026-09-28T10:02:00.000Z"),
      publishedVersionNumber: 2,
      scope: "CATALOG",
      targetUpdatedAt: new Date("2026-09-28T10:01:00.000Z"),
      versionCount: 2,
    }]);

    const result = await getNotificationChannel(
      user([permissionCodes.notificationConfigurationRead]),
      "EMAIL",
    );

    expect(result.targets[0]).toMatchObject({
      catalogKey: "WORKFLOW",
      catalogName: "Workflow",
      defaultSubjectTemplate: "Workflow update for application {{applicationReference}}",
      label: "Workflow Catalog Template",
      lastUpdatedAt: "2026-09-28T10:02:00.000Z",
      publishedVersionNumber: 2,
    });
  });

  it("denies updates without the configuration update permission", async () => {
    await expect(updateNotificationChannel(
      user([]),
      "EMAIL",
      update,
      "correlation-denied",
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(updateNotificationChannelRecord).not.toHaveBeenCalled();
  });

  it("updates a channel for an authorized administrator", async () => {
    vi.mocked(updateNotificationChannelRecord).mockResolvedValue({ code: "EMAIL" });
    vi.mocked(findNotificationChannel).mockResolvedValue({
      channelType: "EMAIL",
      code: "EMAIL",
      displayName: "Email",
      isEnabled: false,
      sortOrder: 20,
      targetCount: 3,
      updatedAt: "2026-09-28T10:01:00.123456Z",
    });

    await expect(updateNotificationChannel(
      user([permissionCodes.notificationConfigurationUpdate]),
      "EMAIL",
      update,
      "correlation-allowed",
    )).resolves.toMatchObject({
      code: "EMAIL",
      isEnabled: false,
      updatedAt: "2026-09-28T10:01:00.123456Z",
    });

    expect(updateNotificationChannelRecord).toHaveBeenCalledWith({
      actorId: "80000000-0000-4000-8000-000000000001",
      channelCode: "EMAIL",
      correlationId: "correlation-allowed",
      update,
    });
  });

  it("rejects a stale update", async () => {
    vi.mocked(updateNotificationChannelRecord).mockResolvedValue(undefined);
    vi.mocked(findNotificationChannel).mockResolvedValue({
      channelType: "EMAIL",
      code: "EMAIL",
      displayName: "Email",
      isEnabled: true,
      sortOrder: 10,
      targetCount: 3,
      updatedAt: "2026-09-28T10:01:00.123456Z",
    });

    await expect(updateNotificationChannel(
      user([permissionCodes.notificationConfigurationUpdate]),
      "EMAIL",
      update,
      "correlation-stale",
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
