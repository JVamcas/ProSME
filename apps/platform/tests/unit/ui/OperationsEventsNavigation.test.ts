import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";
import {
  filterPortalRoutes,
  portalRoutes,
} from "@/shared/ui/portal/portal-navigation";

describe("operations Events navigation", () => {
  it.each([
    permissionCodes.eventRegistrationsReadAll,
    permissionCodes.eventRegistrationSettingsReadAll,
    permissionCodes.eventEmailDeliveryReadAll,
  ])("shows Events under Process Monitor for %s", (permission) => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permission]),
    );
    expect(groupNavigationRoutes(routes)).toMatchObject([
      { id: "overview" },
      {
        id: "process-monitor",
        routes: [{ id: "admin-events", href: "/admin/events", label: "Events" }],
      },
    ]);
  });

  it("hides Events without event read permissions", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.workflowTaskAllRead]),
    );
    expect(routes.some((route) => route.id === "admin-events")).toBe(false);
  });
});
