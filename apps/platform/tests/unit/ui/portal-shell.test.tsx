import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { CapabilityGate } from "@/components/layout/capability-gate";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { createQueryClient } from "@/lib/query-client";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/profile",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const context: PortalContext = {
  userId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  displayName: "Anna Ndeitunga",
  email: "owner@example.test",
  status: "active",
  roleCodes: ["applicant"],
  capabilityCodes: [permissionCodes.userProfileOwnRead],
  availableSpaces: ["applicant"],
  defaultSpace: "applicant",
};

function renderShell(children: React.ReactNode) {
  return renderToStaticMarkup(
    <QueryClientProvider client={createQueryClient()}>
      <AuthenticatedPortalShell context={context} space="applicant">
        {children}
      </AuthenticatedPortalShell>
    </QueryClientProvider>,
  );
}

describe("P3.1 shared authenticated portal shell", () => {
  it("renders the applicant sidebar and mobile navigation on orange surfaces", () => {
    const markup = renderShell(<h1>Profile</h1>);

    expect(markup).toMatch(/<aside[^>]*class="[^"]*bg-brand-orange/);
    expect(markup).toMatch(/<header[^>]*class="[^"]*bg-brand-orange/);
    expect(markup).toContain("background-color:var(--color-brand-orange)");
    expect(markup).toContain("min-w-0 bg-brand-white");
    expect(markup).toContain("fixed inset-x-0 bottom-0 top-16");
    expect(markup).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(markup).toContain('aria-label="Open portal navigation"');
  });

  it("provides labelled navigation and current-route semantics", () => {
    const markup = renderShell(<h1>Profile</h1>);

    expect(markup).toContain('aria-label="Portal navigation"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-label="Open portal navigation"');
    expect(markup).toContain("Search funding opportunities");
    expect(markup).toContain('href="/portal/funding-opportunities"');
    expect(markup).not.toContain('target="_blank"');
    expect(markup).not.toContain("opens in a new tab");
    expect(markup).toContain('aria-label="Notifications unavailable"');
    expect(markup).toContain("AN");
    expect(markup).toContain("My profile");
    expect(markup).not.toContain('aria-label="Breadcrumb"');
    expect(markup).toContain("Help and support");
    expect(markup).toContain("SME Fund home");
  });

  it("gates children against the projected capabilities", () => {
    const markup = renderShell(
      <>
        <CapabilityGate capability={permissionCodes.userProfileOwnRead}>
          <span>Allowed profile</span>
        </CapabilityGate>
        <CapabilityGate capability={permissionCodes.businessOwnRead}>
          <span>Blocked business</span>
        </CapabilityGate>
      </>,
    );

    expect(markup).toContain("Allowed profile");
    expect(markup).not.toContain("Blocked business");
  });

  it("renders fallback and forbidden capability modes", () => {
    const markup = renderShell(
      <>
        <CapabilityGate
          capability={permissionCodes.businessOwnRead}
          mode="fallback"
          fallback={<span>Fallback content</span>}
        >
          <span>Business content</span>
        </CapabilityGate>
        <CapabilityGate
          capability={permissionCodes.businessOwnRead}
          mode="forbidden"
        >
          <span>Restricted content</span>
        </CapabilityGate>
      </>,
    );

    expect(markup).toContain("Fallback content");
    expect(markup).toContain("You do not have permission");
  });

  it("offers a space switcher only to dual-space users", () => {
    const dualContext: PortalContext = {
      ...context,
      capabilityCodes: [
        permissionCodes.userProfileOwnRead,
        permissionCodes.fundingApplicationAllRead,
      ],
      availableSpaces: ["applicant", "operations"],
      defaultSpace: "operations",
    };
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={createQueryClient()}>
        <AuthenticatedPortalShell
          context={dualContext}
          space="applicant"
        >
          <h1>Profile</h1>
        </AuthenticatedPortalShell>
      </QueryClientProvider>,
    );

    expect(markup).toContain('aria-label="Switch portal space"');
    expect(markup).toContain('href="/admin"');
  });

  it("renders permitted nested operations routes closed by default", () => {
    const operationsContext: PortalContext = {
      ...context,
      roleCodes: ["system_administrator"],
      capabilityCodes: [
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.workflowFormRead,
      ],
      availableSpaces: ["operations"],
      defaultSpace: "operations",
    };
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={createQueryClient()}>
        <AuthenticatedPortalShell
          context={operationsContext}
          space="operations"
        >
          <h1>Settings</h1>
        </AuthenticatedPortalShell>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Settings");
    expect(markup).toContain("Administration");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain(">Forms<");
    expect(markup).not.toContain('href="/admin/settings/forms"');
  });

  it("renders the CMS link only for permitted operations users", () => {
    const operationsContext: PortalContext = {
      ...context,
      roleCodes: ["programme_administrator"],
      capabilityCodes: [
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.cmsAccess,
      ],
      availableSpaces: ["operations"],
      defaultSpace: "operations",
    };
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={createQueryClient()}>
        <AuthenticatedPortalShell
          context={operationsContext}
          space="operations"
        >
          <h1>Operations</h1>
        </AuthenticatedPortalShell>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Content management");
    expect(markup).toContain('href="/cms"');
  });

  it("composes the generic portal error state with caller content", () => {
    const markup = renderToStaticMarkup(
      <PortalErrorState
        actionLabel="Reload report"
        description="The report service is temporarily unavailable."
        onAction={() => undefined}
        title="Report unavailable"
      />,
    );

    expect(markup).toContain("Report unavailable");
    expect(markup).toContain("report service is temporarily unavailable");
    expect(markup).toContain("Reload report");
    expect(markup).not.toContain("This workspace could not be loaded");
  });

  it("composes the generic loading state with caller content", () => {
    const markup = renderToStaticMarkup(
      <PortalLoadingState
        description="Preparing the latest assessment records."
        title="Loading assessments"
      />,
    );

    expect(markup).toContain("Loading assessments");
    expect(markup).toContain("Preparing the latest assessment records");
    expect(markup).not.toContain("Loading your workspace");
  });
});
