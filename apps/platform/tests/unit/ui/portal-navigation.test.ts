import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";
import {
  applicantPortalRoutes,
  filterPortalRoutes,
  operationsPortalRoutes,
  portalRoutes,
} from "@/shared/ui/portal/portal-navigation";

describe("P3.1 capability-aware portal navigation", () => {
  it("groups permitted applicant links without empty sections", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "applicant",
      new Set([permissionCodes.userProfileOwnRead]),
    );
    const groups = groupNavigationRoutes(routes);

    expect(groups.map((group) => group.label)).toEqual([
      "Overview",
      "Funding",
      "My account",
    ]);
    expect(groups.map((group) => group.routes.map((route) => route.href))).toEqual([
      ["/portal"],
      ["/portal/funding-opportunities"],
      ["/portal/profile"],
    ]);
    expect(groupNavigationRoutes([])).toEqual([]);
  });

  it("groups operations links after permission filtering", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead]),
    );

    expect(groupNavigationRoutes(routes).map((group) => group.label)).toEqual([
      "Overview",
      "Application management",
    ]);
  });

  it("shows only applicant routes allowed by the projection", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "applicant",
      new Set([permissionCodes.userProfileOwnRead]),
    );

    expect(routes.map((route) => route.href)).toEqual([
      "/portal",
      "/portal/funding-opportunities",
      "/portal/profile",
    ]);
  });

  it("matches the accepted applicant information architecture", () => {
    expect(applicantPortalRoutes.map((route) => route.label)).toEqual([
      "Dashboard",
      "Funding Calls",
      "My businesses",
      "My applications",
      "Notifications",
      "My profile",
    ]);
  });

  it("keeps funding discovery inside the applicant portal", () => {
    const fundingRoute = applicantPortalRoutes.find(
      (route) => route.id === "funding-opportunities",
    );

    expect(fundingRoute).toMatchObject({
      href: "/portal/funding-opportunities",
      label: "Funding Calls",
    });
    expect(fundingRoute?.openInNewTab).toBeUndefined();
  });

  it("does not expose operations routes to an applicant", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.userProfileOwnRead]),
    );

    expect(routes).toEqual([]);
  });

  it("requires an application-read grant for the operations list", () => {
    const broadAdmin = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead]),
    );
    const assignedReader = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.workflowTaskAssignedRead]),
    );

    const applications = operationsPortalRoutes.find(
      (route) => route.id === "admin-applications",
    );
    expect(applications?.requiredAnyPermissions).toEqual([
      permissionCodes.workflowTaskAssignedRead,
      permissionCodes.fundingApplicationAllRead,
    ]);
    expect(broadAdmin.map((route) => route.href)).toEqual([
      "/admin",
      "/admin/applications",
    ]);
    expect(assignedReader.map((route) => route.href)).toContain(
      "/admin/applications",
    );
  });

  it("exposes assigned tasks in the My Queue section", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.workflowTaskAssignedRead]),
    );
    expect(routes.map((route) => route.href)).toEqual([
      "/admin",
      "/admin/work-queue",
      "/admin/applications",
    ]);
    expect(
      groupNavigationRoutes(routes).find((group) => group.id === "queue"),
    ).toMatchObject({
      label: "My Queue",
      routes: [{ href: "/admin/work-queue", label: "Assigned tasks" }],
    });
  });

  it("exposes only independent conflict reviews to a COI reviewer", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.workflowCoiAllReview]),
    );
    const queue = groupNavigationRoutes(routes).find(
      (group) => group.id === "queue",
    );
    expect(queue?.routes).toMatchObject([
      { href: "/admin/conflict-reviews", label: "Conflict reviews" },
    ]);
    const monitor = groupNavigationRoutes(routes).find(
      (group) => group.id === "process-monitor",
    );
    expect(monitor?.routes).toMatchObject([
      { href: "/admin/process-monitor/conflict-reviews", label: "Conflict reviews" },
    ]);
  });

  it("places Process Monitor immediately below My Queue and above Analytics", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([
        permissionCodes.workflowTaskAssignedRead,
        permissionCodes.workflowCoiAllReview,
        permissionCodes.workflowTaskAllRead,
        permissionCodes.chatbotEscalationReadAll,
        permissionCodes.reportingWebsiteReadAll,
      ]),
    );
    const groups = groupNavigationRoutes(routes);
    const queueIndex = groups.findIndex((group) => group.id === "queue");

    expect(groups[queueIndex + 1]?.label).toBe("Process Monitor");
    expect(groups[queueIndex + 2]?.label).toBe("Analytics");
    expect(groups[queueIndex]?.routes.map((route) => route.label)).toEqual([
      "Assigned tasks",
      "Conflict reviews",
      "Escalated cases",
    ]);
    expect(groups[queueIndex + 1]?.routes.map((route) => route.label)).toEqual([
      "Assigned tasks",
      "Conflict reviews",
      "Escalated reviews",
    ]);
    expect(routes.some((route) => route.id === "admin-my-work")).toBe(false);
  });

  it("keeps assigned-only grants out of the all-record monitoring views", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([
        permissionCodes.workflowTaskAssignedRead,
        permissionCodes.chatbotEscalationReadAssigned,
      ]),
    );
    const groups = groupNavigationRoutes(routes);
    expect(groups.some((group) => group.id === "process-monitor")).toBe(false);
    expect(groups.find((group) => group.id === "queue")?.routes.map(
      (route) => route.href,
    )).toEqual([
      "/admin/work-queue",
      "/admin/my-queue/escalated-cases",
    ]);
  });

  it("exposes funding calls only with the canonical read permission", () => {
    const withoutFundingCalls = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead]),
    );
    const withFundingCalls = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingCallRead]),
    );

    expect(withoutFundingCalls.map((route) => route.href)).not.toContain(
      "/admin/funding-calls",
    );
    expect(withFundingCalls.map((route) => route.href)).toContain(
      "/admin/funding-calls",
    );
    expect(
      operationsPortalRoutes.find(
        (route) => route.href === "/admin/funding-calls",
      ),
    ).toMatchObject({
      label: "Funding calls",
      requiredPermission: permissionCodes.fundingCallRead,
    });
  });

  it("keeps CMS access in the workspace switcher rather than duplicating an operations route", () => {
    const withoutCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead]),
    );
    const withCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.cmsAccess,
      ]),
    );

    expect(withoutCmsAccess.map((route) => route.href)).not.toContain("/cms");
    expect(withCmsAccess.map((route) => route.href)).not.toContain("/cms");
    expect(
      operationsPortalRoutes.find((route) => route.href === "/cms"),
    ).toBeUndefined();
  });

  it("removes a parent when all nested routes are inaccessible", () => {
    const routes = filterPortalRoutes(
      [
        {
          id: "parent",
          href: "/portal/parent",
          label: "Parent",
          icon: portalRoutes[0].icon,
          space: "applicant",
          children: [
            {
              id: "child",
              href: "/portal/parent/child",
              label: "Child",
              icon: portalRoutes[0].icon,
              space: "applicant",
              requiredPermission: permissionCodes.businessOwnRead,
            },
          ],
        },
      ],
      "applicant",
      new Set([permissionCodes.userProfileOwnRead]),
    );

    expect(routes).toEqual([]);
  });
});
