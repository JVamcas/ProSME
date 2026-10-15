import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";
import {
  filterPortalRoutes,
  operationsPortalRoutes,
} from "@/shared/ui/portal/portal-navigation";

describe("Administration navigation", () => {
  it("places configuration links directly in Administration", () => {
    const administration = groupNavigationRoutes(operationsPortalRoutes).find(
      (group) => group.id === "administration",
    );

    expect(administration?.routes.map((route) => route.label)).toEqual([
      "Branding",
      "Forms",
      "Workflow Templates",
      "Notifications",
      "Eligibility rulesets",
      "Users & access",
    ]);
    expect(operationsPortalRoutes.some((route) => route.id === "admin-settings"))
      .toBe(false);
  });

  it.each([
    [permissionCodes.brandingRead, "/admin/settings/branding"],
    [permissionCodes.workflowFormRead, "/admin/settings/forms"],
    [permissionCodes.workflowDefinitionRead, "/admin/workflows"],
    [permissionCodes.notificationConfigurationRead, "/admin/notifications"],
    [permissionCodes.eligibilityRuleSetRead, "/admin/settings/eligibility-rulesets"],
  ])("limits Administration to the grant %s", (permission, href) => {
    const routes = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      new Set([permission]),
    );
    const administration = groupNavigationRoutes(routes).find(
      (group) => group.id === "administration",
    );

    expect(administration?.routes.map((route) => route.href)).toEqual([href]);
  });

});
