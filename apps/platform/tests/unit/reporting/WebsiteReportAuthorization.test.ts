import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  schedules: vi.fn(),
  schedule: vi.fn(),
  update: vi.fn(),
  configuration: vi.fn(),
}));
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteReportReadRepository",
  () => ({
    listSavedWebsiteReports: mocks.list,
    findSavedWebsiteReport: mocks.detail,
  }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteReportScheduleRepository",
  () => ({
    listWebsiteReportSchedules: mocks.schedules,
    findWebsiteReportSchedule: mocks.schedule,
    updateWebsiteReportSchedule: mocks.update,
  }),
);
vi.mock(
  "@/modules/reporting/infrastructure/GoogleAnalyticsConfiguration",
  () => ({ googleAnalyticsConfiguration: mocks.configuration }),
);
import {
  permissionCodes,
  getPermissionDefinition,
  getPermissionGroup,
} from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  getSavedWebsiteReport,
  getSavedWebsiteReports,
  getWebsiteReportSchedules,
  saveWebsiteReportSchedule,
} from "@/modules/reporting/ServerWebsiteReportService";

const id = "10000000-0000-4000-8000-000000000001";
const actor = (
  permissions: string[],
  status: AuthenticatedUser["status"] = "active",
): AuthenticatedUser => ({
  id,
  status,
  capabilities: new Set(permissions),
  identitySubject: id,
  roleCodes: new Set(),
  displayName: "Report operator",
  email: "reporting@example.test",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
});
const settings = {
  expectedVersion: 1,
  enabled: true,
  anchorDate: "2026-09-01",
  sendTime: "09:00",
  finalizationDelayHours: 48,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.configuration.mockReturnValue({
    propertyId: "123",
    timezone: "Africa/Windhoek",
    collectionStart: "2026-01-01",
  });
  mocks.schedule.mockResolvedValue({ id, frequency: "MONTHLY" });
  mocks.detail.mockResolvedValue({ id, snapshot: { saved: true } });
});

describe("website reports use explicit authorization and resource validation", () => {
  it.each([
    { grants: [] },
    { grants: [permissionCodes.reportingWebsiteReadAll] },
    { grants: [permissionCodes.fundingApplicationAllRead] },
    { grants: [permissionCodes.cmsAccess] },
  ])(
    "denies report reads for unrelated grants %j before repository access",
    async ({ grants }) => {
      await expect(getSavedWebsiteReport(actor(grants), id)).rejects.toThrow(
        "Missing",
      );
      expect(mocks.detail).not.toHaveBeenCalled();
    },
  );
  it("denies anonymous and suspended actors", async () => {
    await expect(
      getSavedWebsiteReports(null, { page: 1, pageSize: 20 }),
    ).rejects.toThrow("Authentication");
    await expect(
      getWebsiteReportSchedules(
        actor([permissionCodes.reportingWebsiteReportReadAll], "suspended"),
      ),
    ).rejects.toThrow("Missing");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.schedules).not.toHaveBeenCalled();
  });
  it("reads immutable snapshots with no GA configuration or provider request", async () => {
    mocks.configuration.mockReturnValue(null);
    expect(
      await getSavedWebsiteReport(
        actor([permissionCodes.reportingWebsiteReportReadAll]),
        id,
      ),
    ).toEqual({ id, snapshot: { saved: true } });
    expect(mocks.configuration).not.toHaveBeenCalled();
  });
  it("separates read and schedule permissions and validates the target", async () => {
    await expect(
      saveWebsiteReportSchedule(
        actor([permissionCodes.reportingWebsiteReportReadAll]),
        id,
        settings,
      ),
    ).rejects.toThrow("Missing");
    const user = actor([permissionCodes.reportingWebsiteScheduleUpdateAll]);
    await expect(
      saveWebsiteReportSchedule(user, id, {
        ...settings,
        anchorDate: "2026-09-07",
      }),
    ).rejects.toThrow("first");
    await expect(
      saveWebsiteReportSchedule(user, id, {
        ...settings,
        anchorDate: "2025-12-01",
      }),
    ).rejects.toThrow("collection");
    mocks.schedule.mockResolvedValue(null);
    await expect(saveWebsiteReportSchedule(user, id, settings)).rejects.toThrow(
      "not found",
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("updates a valid schedule with an audited actor and property timezone", async () => {
    await saveWebsiteReportSchedule(
      actor([permissionCodes.reportingWebsiteScheduleUpdateAll]),
      id,
      settings,
    );
    expect(mocks.update).toHaveBeenCalledWith({
      id,
      actorId: id,
      values: settings,
      timezone: "Africa/Windhoek",
    });
    for (const code of [
      permissionCodes.reportingWebsiteReportReadAll,
      permissionCodes.reportingWebsiteScheduleUpdateAll,
    ]) {
      expect(getPermissionDefinition(code)).toBeDefined();
      expect(getPermissionGroup(code)?.id).toBe("reporting");
    }
  });
});
