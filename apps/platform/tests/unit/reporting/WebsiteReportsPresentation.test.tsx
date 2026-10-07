import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  settings: vi.fn(),
  detail: vi.fn(),
  mutation: vi.fn(),
}));
vi.mock("@/modules/reporting/ui/reports/useWebsiteReports", () => ({
  useWebsiteReports: mocks.history,
  useWebsiteReportSettings: mocks.settings,
  useWebsiteReport: mocks.detail,
  useUpdateWebsiteReportSchedule: mocks.mutation,
}));
vi.mock(
  "@/modules/notifications/ui/NotificationRuleDeliveryConfiguration",
  () => ({
    NotificationRuleDeliveryConfiguration: () => (
      <p>Designated report recipients</p>
    ),
  }),
);
import { WebsiteReportsWorkspace } from "@/modules/reporting/ui/reports/WebsiteReportsWorkspace";
import { WebsiteReportSettingsWorkspace } from "@/modules/reporting/ui/reports/WebsiteReportSettingsWorkspace";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  filterPortalRoutes,
  operationsPortalRoutes,
} from "@/shared/ui/portal/portal-navigation";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";

const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.history.mockReturnValue({
    data: {
      rows: [
        {
          id,
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          frequency: "MONTHLY",
          state: "GENERATED",
          deliveryState: "PENDING",
          note: null,
        },
      ],
      total: 1,
    },
    isPending: false,
    isFetching: false,
  });
  mocks.settings.mockReturnValue({
    data: {
      propertyTimezone: "Africa/Windhoek",
      collectionStart: "2026-01-01",
      schedules: [
        {
          id,
          frequency: "MONTHLY",
          eventKey: "reporting.website.monthly",
          version: 1,
          enabled: false,
          anchorDate: null,
          nextDueAt: null,
          sendTime: "09:00",
          finalizationDelayHours: 48,
        },
      ],
    },
  });
  mocks.mutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe("website report navigation and settings presentation", () => {
  it("shows five history columns, saved detail links and the requested settings route", () => {
    const html = renderToStaticMarkup(<WebsiteReportsWorkspace canConfigure />);
    for (const label of [
      "Period",
      "Frequency",
      "Generation",
      "Email delivery",
      "Notes",
    ])
      expect(html).toContain(label);
    expect(html).toContain(`/admin/reports/website/${id}`);
    expect(html).toContain("/admin/reports/settings");
    expect(html).toContain("Bi-weekly");
    expect(html).toContain("Monthly");
  });
  it("shows property-local settings and guards recipient editing", () => {
    const html = renderToStaticMarkup(
      <WebsiteReportSettingsWorkspace
        canUpdate
        canReadRecipients={false}
        canUpdateRecipients={false}
      />,
    );
    expect(html).toContain("Africa/Windhoek");
    expect(html).toContain("First period start");
    expect(html).toContain("Source finalization delay");
    expect(html).not.toContain("Designated report recipients");
    const authorized = renderToStaticMarkup(
      <WebsiteReportSettingsWorkspace
        canUpdate
        canReadRecipients
        canUpdateRecipients
      />,
    );
    expect(authorized).toContain("Designated report recipients");
  });
  it("uses the shared loading state and query error state for settings", () => {
    mocks.settings.mockReturnValue({ data: undefined, isPending: true });
    const loading = renderToStaticMarkup(
      <WebsiteReportSettingsWorkspace
        canUpdate
        canReadRecipients={false}
        canUpdateRecipients={false}
      />,
    );
    expect(loading).toContain("Just a moment...");
    expect(loading).toContain('role="status"');
    expect(loading).not.toContain("Period and delivery time");

    mocks.settings.mockReturnValue({
      isError: true,
      error: new Error("Settings unavailable"),
      refetch: vi.fn(),
    });
    const failed = renderToStaticMarkup(
      <WebsiteReportSettingsWorkspace
        canUpdate
        canReadRecipients={false}
        canUpdateRecipients={false}
      />,
    );
    expect(failed).toContain("Unable to load report settings");
    expect(failed).toContain("Settings unavailable");
    expect(failed).toContain("Try again");
  });
  it("filters saved reports and configuration independently under Reporting", () => {
    const read = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      new Set([permissionCodes.reportingWebsiteReportReadAll]),
    );
    expect(read.map((route) => route.href)).toContain("/admin/reports/website");
    expect(read.map((route) => route.href)).not.toContain(
      "/admin/reports/settings",
    );
    expect(groupNavigationRoutes(read).map((group) => group.label)).toContain(
      "Reporting",
    );
    const update = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      new Set([permissionCodes.reportingWebsiteScheduleUpdateAll]),
    );
    expect(update.map((route) => route.href)).toContain(
      "/admin/reports/settings",
    );
    const analytics = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      new Set([permissionCodes.reportingWebsiteReadAll]),
    );
    expect(
      groupNavigationRoutes(analytics).map((group) => group.label),
    ).not.toContain("Reporting");
  });
});
