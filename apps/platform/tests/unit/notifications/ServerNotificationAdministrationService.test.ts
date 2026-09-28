import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/infrastructure/NotificationAdministrationRepository", () => ({
  findNotificationCatalogRecord: vi.fn(),
  findNotificationEventRuleRecord: vi.fn(),
  getNotificationOperationalSummaryRecord: vi.fn(),
  listNotificationCatalogRecords: vi.fn(),
  listNotificationDeliveryRecords: vi.fn(),
  listNotificationEventRuleRecords: vi.fn(),
  retryNotificationDeliveryRecord: vi.fn(),
  updateNotificationCatalogRecord: vi.fn(),
  updateNotificationEventRuleRecord: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  getNotificationDeliveries,
  retryNotificationDelivery,
  updateNotificationCatalog,
  updateNotificationEventRule,
} from "@/modules/notifications/application/ServerNotificationAdministrationService";
import {
  findNotificationCatalogRecord,
  findNotificationEventRuleRecord,
  listNotificationDeliveryRecords,
  retryNotificationDeliveryRecord,
  updateNotificationCatalogRecord,
  updateNotificationEventRuleRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";

function user(permissions: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(permissions),
    createdAt: new Date(),
    email: "operator@example.com",
    displayName: "Operator",
    id: "80000000-0000-4000-8000-000000000001",
    identitySubject: "firebase-operator",
    lastLoginAt: null,
    roleCodes: new Set(["OPERATIONS"]),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notification administration service", () => {
  it("denies delivery history without the delivery read permission", async () => {
    await expect(getNotificationDeliveries(user([]), {
      page: 1,
      pageSize: 25,
      sortDirection: "desc",
      sortField: "createdAt",
    })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listNotificationDeliveryRecords).not.toHaveBeenCalled();
  });

  it("returns the SQL repository page without recipient body content", async () => {
    vi.mocked(listNotificationDeliveryRecords).mockResolvedValue({
      items: [{
        applicationReference: "SME-1",
        deliveryId: "81000000-0000-4000-8000-000000000001",
        recipientEmail: "applicant@example.com",
      }],
      total: 1,
    });
    const result = await getNotificationDeliveries(
      user([permissionCodes.notificationDeliveryRead]),
      { page: 1, pageSize: 25, sortDirection: "desc", sortField: "createdAt" },
    );
    expect(result).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(JSON.stringify(result)).not.toMatch(/htmlTemplate|plainTextTemplate|credentials/i);
  });

  it("rejects a stale catalog update", async () => {
    vi.mocked(updateNotificationCatalogRecord).mockResolvedValue(undefined);
    vi.mocked(findNotificationCatalogRecord).mockResolvedValue({ catalogKey: "APPLICATIONS" });
    await expect(updateNotificationCatalog(
      user([permissionCodes.notificationConfigurationUpdate]),
      "APPLICATIONS",
      {
        description: "Application events",
        displayName: "Applications",
        expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
        isEnabled: true,
        sortOrder: 10,
      },
      "correlation-1",
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("allows a configuration administrator to update a catalog", async () => {
    vi.mocked(updateNotificationCatalogRecord).mockResolvedValue({
      catalogKey: "APPLICATIONS",
      updatedAt: new Date("2026-09-28T10:01:00.000Z"),
    });
    vi.mocked(findNotificationCatalogRecord).mockResolvedValue({
      catalogKey: "APPLICATIONS",
      description: "Application events",
      displayName: "Applications",
      eventCount: 1,
      events: [],
      isEnabled: false,
      sortOrder: 10,
      updatedAt: new Date("2026-09-28T10:01:00.000Z"),
    });
    await expect(updateNotificationCatalog(
      user([permissionCodes.notificationConfigurationUpdate]),
      "APPLICATIONS",
      {
        description: "Application events",
        displayName: "Applications",
        expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
        isEnabled: false,
        sortOrder: 10,
      },
      "correlation-allowed",
    )).resolves.toMatchObject({ catalogKey: "APPLICATIONS", isEnabled: false });
    expect(updateNotificationCatalogRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "80000000-0000-4000-8000-000000000001" }),
    );
  });

  it("keeps immutable recipient identities during an atomic rule update", async () => {
    vi.mocked(findNotificationEventRuleRecord).mockResolvedValue({
      channels: [{ code: "EMAIL", isEnabled: true }],
      recipients: [{ recipientType: "APPLICATION_OWNER" }],
    });
    await expect(updateNotificationEventRule(
      user([permissionCodes.notificationConfigurationUpdate]),
      "application.submitted",
      {
        eventEnabled: true,
        expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
        isEnabled: true,
        recipients: [{
          channelCodes: ["EMAIL"],
          isRequired: true,
          recipientType: "ASSIGNED_USER",
        }],
      },
      "correlation-2",
    )).rejects.toBeInstanceOf(ResourceConflictError);
    expect(updateNotificationEventRuleRecord).not.toHaveBeenCalled();
  });

  it("authorizes and schedules retry without invoking delivery transport", async () => {
    vi.mocked(retryNotificationDeliveryRecord).mockResolvedValue({ outcome: "SCHEDULED" });
    await expect(retryNotificationDelivery(
      user([permissionCodes.notificationDeliveryRetry]),
      "81000000-0000-4000-8000-000000000001",
      { reason: "SMTP configuration has been corrected." },
      "correlation-3",
    )).resolves.toEqual({ outcome: "SCHEDULED" });
    expect(retryNotificationDeliveryRecord).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "80000000-0000-4000-8000-000000000001",
      reason: "SMTP configuration has been corrected.",
    }));
  });
});
