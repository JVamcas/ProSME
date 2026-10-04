"use client";

import { NavWrapper } from "@payloadcms/next/client";
import { useNav, useWindowInfo } from "@payloadcms/ui";
import { useState } from "react";
import { NavigationSidebar } from "@/shared/ui/navigation/NavigationSidebar";
import {
  SidebarResizeHandle,
  sidebarWidths,
} from "@/shared/ui/navigation/SidebarResizeHandle";
import CmsLogoutButton from "./CmsLogoutButton";
import CmsNavigationLinks from "./CmsNavigationLinks";

export default function CmsSidebar({
  displayName,
  email,
}: {
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

  return (
    <NavWrapper baseClass="nav">
      <style>{`.template-default:has(.cms-sidebar) { --nav-width: ${width}px; }`}</style>
      <NavigationSidebar
        className="cms-sidebar"
        collapsed={isCollapsed}
        dark
        displayName={displayName}
        email={email}
        footer={<CmsLogoutButton collapsed={isCollapsed} />}
        logoHref="/cms"
        onClose={() => setNavOpen(false)}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
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
          onNavigate={() => {
            if (mobile) setNavOpen(false);
          }}
        />
      </NavigationSidebar>
    </NavWrapper>
  );
}
