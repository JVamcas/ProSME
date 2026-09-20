"use client";

import type { PortalSpace } from "@/auth/authorization/portal-access";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";
import { CapabilityProvider } from "./capability-context";
import { PortalMobileHeader } from "./portal-mobile-header";
import { PortalNavList } from "./portal-nav-list";
import { PortalHelpLink, PortalUserSummary } from "./portal-shell-support";
import { PortalSpaceSwitcher } from "./portal-space-switcher";
import { PortalTopbar } from "./portal-topbar";
import { filterPortalRoutes, portalRoutes } from "./portal-navigation";

type AuthenticatedPortalShellProps = {
  children: React.ReactNode;
  context: PortalContext;
  space: PortalSpace;
};

function Sidebar({
  context,
  space,
}: Omit<AuthenticatedPortalShellProps, "children">) {
  const granted = new Set(context.capabilityCodes);
  const routes = filterPortalRoutes(portalRoutes, space, granted);

  const dark = space === "operations";

  return (
    // Keep the approved base class visible while operations overrides the surface inline.
    // prettier-ignore
    <aside className="sticky top-0 hidden h-screen overflow-hidden bg-brand-orange p-5 lg:flex lg:flex-col" style={dark ? { backgroundColor: "var(--color-brand-navy)" } : undefined}>
      <Logo className="" href="/" compact inverted={dark} />
      <div className="mt-6 shrink-0">
        <PortalUserSummary context={context} dark={dark} />
      </div>
      <div className="mt-5 shrink-0">
        <PortalSpaceSwitcher
          availableSpaces={context.availableSpaces}
          currentSpace={space}
          dark={dark}
        />
      </div>
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <PortalNavList dark={dark} routes={routes} />
      </div>
      <div
        className={`shrink-0 border-t pt-3 ${dark ? "border-white/15" : "border-brand-navy/15"}`}
      >
        <PortalHelpLink dark={dark} />
        <LogoutButton tone={dark ? "dark" : "brand"} />
      </div>
    </aside>
  );
}

export function AuthenticatedPortalShell({
  children,
  context,
  space,
}: AuthenticatedPortalShellProps) {
  return (
    <CapabilityProvider value={context}>
      <div className="min-h-screen bg-brand-white lg:grid lg:grid-cols-[272px_1fr]">
        <Sidebar context={context} space={space} />
        <div className="min-w-0 bg-brand-white">
          <PortalMobileHeader context={context} space={space} />
          <PortalTopbar context={context} space={space} />
          <main className="w-full p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </CapabilityProvider>
  );
}
