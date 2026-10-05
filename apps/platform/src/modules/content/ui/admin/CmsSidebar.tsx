"use client";

import { NavWrapper } from "@payloadcms/next/client";
import { useNav, useWindowInfo } from "@payloadcms/ui";
import { useLayoutEffect, useState } from "react";
import { NavigationSidebar } from "@/shared/ui/navigation/NavigationSidebar";
import type { WorkspaceSpace } from "@/auth/authorization/portal-access";
import { PortalSpaceSwitcher } from "@/shared/ui/portal/portal-space-switcher";
import {
  SidebarResizeHandle,
  sidebarWidths,
} from "@/shared/ui/navigation/SidebarResizeHandle";
import CmsLogoutButton from "./CmsLogoutButton";
import CmsNavigationLinks from "./CmsNavigationLinks";

export default function CmsSidebar({
  availableSpaces,
  displayName,
  email,
}: {
  availableSpaces: readonly WorkspaceSpace[];
  displayName: string;
  email: string;
}) {
  const { setNavOpen } = useNav();
  const { breakpoints } = useWindowInfo();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState(sidebarWidths.expanded);
  const mobile = Boolean(breakpoints.m);
  const isCollapsed = !mobile && collapsed;
  const width = isCollapsed ? sidebarWidths.collapsed : expandedWidth;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousWidth = root.style.getPropertyValue("--cms-nav-width");
    root.style.setProperty("--cms-nav-width", `${width}px`);
    return () => {
      if (previousWidth) {
        root.style.setProperty("--cms-nav-width", previousWidth);
      } else {
        root.style.removeProperty("--cms-nav-width");
      }
    };
  }, [width]);

  return (
    <NavWrapper baseClass="nav">
      <NavigationSidebar
        className="cms-sidebar"
        collapsed={isCollapsed}
        dark
        displayName={displayName}
        email={email}
        footer={<CmsLogoutButton collapsed={isCollapsed} />}
        logoHref="/cms"
        surface="yellow"
        onClose={() => setNavOpen(false)}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        workspace={
          <div className="[&_a]:text-white [&_p]:text-white [&_[aria-disabled=true]]:text-white/40">
            <PortalSpaceSwitcher
              availableSpaces={availableSpaces}
              currentSpace="cms"
            />
          </div>
        }
        resizeHandle={
          !isCollapsed ? (
            <SidebarResizeHandle
              onResize={setExpandedWidth}
              width={expandedWidth}
            />
          ) : null
        }
      >
        <CmsNavigationLinks
          collapsed={isCollapsed}
          onRequestExpand={() => setCollapsed(false)}
          onNavigate={() => {
            if (mobile) setNavOpen(false);
          }}
        />
      </NavigationSidebar>
    </NavWrapper>
  );
}
