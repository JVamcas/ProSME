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
import { WorkspaceLayout } from "../navigation/WorkspaceLayout";
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
      className="relative hidden h-full overflow-hidden bg-brand-orange lg:flex lg:flex-col"
      data-collapsed={collapsed}
      style={{
        backgroundColor: dark
          ? "var(--color-brand-navy)"
          : "var(--color-brand-orange)",
        width,
      }}
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
  const width = sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidth;

  return (
    <CapabilityProvider value={context}>
      <WorkspaceLayout
        header={
          <>
            <PortalMobileHeader context={context} space={space} />
            <PortalTopbar context={context} space={space} />
          </>
        }
        sidebar={
          <Sidebar
            collapsed={sidebarCollapsed}
            context={context}
            onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
            onResize={(clientX) => setSidebarWidth(clampSidebarWidth(clientX))}
            space={space}
            width={width}
          />
        }
        sidebarWidth={width}
      >
        {children}
      </WorkspaceLayout>
    </CapabilityProvider>
  );
}
