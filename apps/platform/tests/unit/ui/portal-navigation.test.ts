import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { capabilities } from "@/auth/authorization/capabilities";
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
      new Set([capabilities.profileReadOwn]),
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
      new Set([capabilities.profileReadOwn]),
    );

    expect(routes).toEqual([]);
  });

  it("requires an application-read grant for the operations list", () => {
    const broadAdmin = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([capabilities.adminAccess]),
    );
    const assignedReader = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([
        capabilities.adminAccess,
        capabilities.applicationReadAssigned,
      ]),
    );

    const applications = operationsPortalRoutes.find(
      (route) => route.id === "admin-applications",
    );
    expect(applications?.requiredAnyCapabilities).toEqual([
      capabilities.applicationReadAssigned,
      capabilities.applicationReadAll,
    ]);
    expect(broadAdmin.map((route) => route.href)).toEqual(["/admin"]);
    expect(assignedReader.map((route) => route.href)).toContain(
      "/admin/applications",
    );
  });

  it("exposes the work queue only with its dedicated capability", () => {
    const routes = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([capabilities.adminAccess, capabilities.workQueueRead]),
    );
    expect(routes.map((route) => route.href)).toEqual([
      "/admin",
      "/admin/work-queue",
    ]);
  });

  it("exposes content management only with CMS access", () => {
    const withoutCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([capabilities.adminAccess]),
    );
    const withCmsAccess = filterPortalRoutes(
      portalRoutes,
      "operations",
      new Set([capabilities.adminAccess, capabilities.cmsAccess]),
    );

    expect(withoutCmsAccess.map((route) => route.href)).not.toContain("/cms");
    expect(withCmsAccess.map((route) => route.href)).toContain("/cms");
    expect(
      operationsPortalRoutes.find((route) => route.href === "/cms"),
    ).toMatchObject({
      label: "Content management",
      requiredCapability: capabilities.cmsAccess,
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
              requiredCapability: capabilities.businessReadOwn,
            },
          ],
        },
      ],
      "applicant",
      new Set([capabilities.profileReadOwn]),
    );

    expect(routes).toEqual([]);
  });

  it("keeps the responsive shell on the approved orange surface", () => {
    const shell = readFileSync(
      resolve(
        process.cwd(),
        "src/components/layout/authenticated-portal-shell.tsx",
      ),
      "utf8",
    );
    const mobileHeader = readFileSync(
      resolve(
        process.cwd(),
        "src/components/layout/portal-mobile-header.tsx",
      ),
      "utf8",
    );

    expect(shell).toContain(
      '<aside className="sticky top-0 hidden h-screen overflow-hidden bg-brand-orange',
    );
    expect(shell).toContain(
      '<div className="min-h-screen bg-brand-white lg:grid',
    );
    expect(mobileHeader).toContain("bg-brand-orange");
    expect(mobileHeader).toContain("fixed inset-x-0 bottom-0 top-16");
    expect(mobileHeader).toContain("lg:hidden");
    expect(shell).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(mobileHeader).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(mobileHeader).toContain('aria-label="Open portal navigation"');
  });
});
