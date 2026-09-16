import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { capabilities } from "@/auth/authorization/capabilities";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { CapabilityGate } from "@/components/layout/capability-gate";
import { PortalErrorState } from "@/components/layout/portal-error-state";
import { PortalLoadingState } from "@/components/layout/portal-loading-state";
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
  capabilityCodes: [capabilities.profileReadOwn],
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
        <CapabilityGate capability={capabilities.profileReadOwn}>
          <span>Allowed profile</span>
        </CapabilityGate>
        <CapabilityGate capability={capabilities.businessReadOwn}>
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
          capability={capabilities.businessReadOwn}
          mode="fallback"
          fallback={<span>Fallback content</span>}
        >
          <span>Business content</span>
        </CapabilityGate>
        <CapabilityGate
          capability={capabilities.businessReadOwn}
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
        capabilities.profileReadOwn,
        capabilities.adminAccess,
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

  it("renders permitted nested operations routes", () => {
    const operationsContext: PortalContext = {
      ...context,
      roleCodes: ["system_administrator"],
      capabilityCodes: [
        capabilities.adminAccess,
        capabilities.formRead,
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
    expect(markup).toContain("Forms");
    expect(markup).toContain('href="/admin/settings/forms"');
  });

  it("renders the CMS link only for permitted operations users", () => {
    const operationsContext: PortalContext = {
      ...context,
      roleCodes: ["programme_administrator"],
      capabilityCodes: [
        capabilities.adminAccess,
        capabilities.cmsAccess,
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
