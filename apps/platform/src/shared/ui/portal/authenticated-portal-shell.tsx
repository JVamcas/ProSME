"use client";

import { useState } from "react";

import type { PortalSpace } from "@/auth/authorization/portal-access";
import { LogoutButton } from "@/shared/ui/portal/LogoutButton";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";
import { CapabilityProvider } from "./capability-context";
import { PortalMobileHeader } from "./portal-mobile-header";
import { PortalNavList } from "./portal-nav-list";
import { PortalHelpLink } from "./portal-shell-support";
import { PortalSpaceSwitcher } from "./portal-space-switcher";
import { PortalTopbar } from "./portal-topbar";
import { filterPortalRoutes, portalRoutes } from "./portal-navigation";
import { NavigationSidebar } from "../navigation/NavigationSidebar";
import {
  clampSidebarWidth,
  SidebarResizeHandle,
  sidebarWidths,
} from "../navigation/SidebarResizeHandle";

type AuthenticatedPortalShellProps = {
  children: React.ReactNode;
  context: PortalContext;
  space: PortalSpace;
};

function Sidebar({
  collapsed,
  context,
  onToggleCollapsed,
  onResize,
  space,
  width,
}: Omit<AuthenticatedPortalShellProps, "children"> & {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onResize: (width: number) => void;
  width: number;
}) {
  const granted = new Set(context.capabilityCodes);
  const routes = filterPortalRoutes(portalRoutes, space, granted);
  const dark = space === "operations";

  return (
    <aside
      className="relative sticky top-0 hidden h-screen overflow-hidden bg-brand-orange lg:flex lg:flex-col"
      data-collapsed={collapsed}
      style={
        dark ? { backgroundColor: "var(--color-brand-navy)", width } : { width }
      }
    >
      <NavigationSidebar
        collapsed={collapsed}
        dark={dark}
        displayName={context.displayName}
        email={context.email}
        footer={
          <>
            <PortalHelpLink collapsed={collapsed} dark={dark} />
            <LogoutButton
              collapsed={collapsed}
              tone={dark ? "dark" : "brand"}
            />
          </>
        }
        onToggleCollapsed={onToggleCollapsed}
        resizeHandle={
          !collapsed ? (
            <SidebarResizeHandle onResize={onResize} width={width} />
          ) : null
        }
        workspace={
          <PortalSpaceSwitcher
            availableSpaces={context.availableSpaces}
            currentSpace={space}
            dark={dark}
          />
        }
      >
        <PortalNavList
          collapsed={collapsed}
          dark={dark}
          onRequestExpand={onToggleCollapsed}
          routes={routes}
        />
      </NavigationSidebar>
    </aside>
  );
}

export function AuthenticatedPortalShell({
  children,
  context,
  space,
}: AuthenticatedPortalShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(sidebarWidths.expanded);
  return (
    <CapabilityProvider value={context}>
      <div
        className="min-h-screen transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:grid"
        style={{
          backgroundColor:
            space === "operations"
              ? "var(--color-brand-navy)"
              : "var(--color-brand-orange)",
          gridTemplateColumns: `${sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidth}px minmax(0, 1fr)`,
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          context={context}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onResize={(clientX) => setSidebarWidth(clampSidebarWidth(clientX))}
          space={space}
          width={sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidth}
        />
        <div className="min-w-0 bg-brand-white">
          <PortalMobileHeader context={context} space={space} />
          <PortalTopbar context={context} space={space} />
          <main className="w-full p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </CapabilityProvider>
  );
}
