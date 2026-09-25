import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  applicantPortalRoutes,
  filterPortalRoutes,
  operationsPortalRoutes,
  portalRoutes,
} from "@/components/layout/portal-navigation";

describe("P3.1 capability-aware portal navigation", () => {
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
      "Funding opportunities",
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
      label: "Funding opportunities",
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

  it("exposes the work queue only with its dedicated capability", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.workflowTaskPoolRead]),
    );
    expect(routes.map((route) => route.href)).toEqual([
      "/admin",
      "/admin/work-queue",
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

  it("exposes content management only with CMS access", () => {
    const withoutCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead]),
    );
    const withCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([permissionCodes.fundingApplicationAllRead, permissionCodes.cmsAccess]),
    );

    expect(withoutCmsAccess.map((route) => route.href)).not.toContain("/cms");
    expect(withCmsAccess.map((route) => route.href)).toContain("/cms");
    expect(
      operationsPortalRoutes.find((route) => route.href === "/cms"),
    ).toMatchObject({
      label: "Content management",
      requiredPermission: permissionCodes.cmsAccess,
    });
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
