"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRef, useState } from "react";

import type { PortalSpace } from "@/auth/authorization/portal-access";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { cn } from "@/lib/utils";
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

const DEFAULT_SIDEBAR_WIDTH = 272;
const COLLAPSED_SIDEBAR_WIDTH = 80;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function Sidebar({
  collapsed,
  context,
  onToggleCollapsed,
  onPointerResize,
  onResize,
  onResizeEnd,
  onResizeStart,
  space,
  width,
}: Omit<AuthenticatedPortalShellProps, "children"> & {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPointerResize: (clientX: number) => void;
  onResize: (clientX: number) => void;
  onResizeEnd: () => void;
  onResizeStart: () => void;
  width: number;
}) {
  const granted = new Set(context.capabilityCodes);
  const routes = filterPortalRoutes(portalRoutes, space, granted);

  const dark = space === "operations";

  return (
    // Keep the approved base class visible while operations overrides the surface inline.
    <aside
      className={cn(
        "relative sticky top-0 hidden h-screen overflow-hidden bg-brand-orange transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:flex lg:flex-col",
        collapsed ? "p-3" : "p-5",
      )}
      data-collapsed={collapsed}
      style={
        dark ? { backgroundColor: "var(--color-brand-navy)", width } : { width }
      }
    >
      <div
        className={cn(
          "flex shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between gap-3",
        )}
      >
        {!collapsed ? <Logo href="/" compact inverted={dark} /> : null}
        <button
          aria-label={
            collapsed
              ? "Expand navigation sidebar"
              : "Collapse navigation sidebar"
          }
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2",
            dark
              ? "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white"
              : "text-brand-navy/80 hover:bg-brand-navy/10 hover:text-brand-navy focus-visible:ring-brand-navy",
          )}
          onClick={onToggleCollapsed}
          title={
            collapsed
              ? "Expand navigation sidebar"
              : "Collapse navigation sidebar"
          }
          type="button"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
      <div className="mt-6 shrink-0">
        <PortalUserSummary
          collapsed={collapsed}
          context={context}
          dark={dark}
        />
      </div>
      <div className={cn("mt-5 shrink-0", collapsed && "hidden")}>
        <PortalSpaceSwitcher
          availableSpaces={context.availableSpaces}
          currentSpace={space}
          dark={dark}
        />
      </div>
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <PortalNavList
          collapsed={collapsed}
          dark={dark}
          onRequestExpand={onToggleCollapsed}
          routes={routes}
        />
      </div>
      <div
        className={`shrink-0 border-t pt-3 ${dark ? "border-white/15" : "border-brand-navy/15"}`}
      >
        <PortalHelpLink collapsed={collapsed} dark={dark} />
        <LogoutButton collapsed={collapsed} tone={dark ? "dark" : "brand"} />
      </div>
      {!collapsed ? (
        <div
          aria-label="Resize navigation sidebar"
          aria-orientation="vertical"
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuenow={width}
          className={cn(
            "absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
            dark
              ? "hover:bg-white/20 focus-visible:ring-white"
              : "hover:bg-brand-navy/20 focus-visible:ring-brand-navy",
          )}
          onDoubleClick={() => onResize(DEFAULT_SIDEBAR_WIDTH)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onResize(width - 16);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              onResize(width + 16);
            } else if (event.key === "Home") {
              event.preventDefault();
              onResize(MIN_SIDEBAR_WIDTH);
            } else if (event.key === "End") {
              event.preventDefault();
              onResize(MAX_SIDEBAR_WIDTH);
            }
          }}
          onLostPointerCapture={onResizeEnd}
          onPointerDown={(event) => {
            onResizeStart();
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => onPointerResize(event.clientX)}
          onPointerUp={(event) => {
            onResizeEnd();
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          role="separator"
          tabIndex={0}
          title="Drag to resize; double-click to reset"
        />
      ) : null}
    </aside>
  );
}

export function AuthenticatedPortalShell({
  children,
  context,
  space,
}: AuthenticatedPortalShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const resizing = useRef(false);

  function resizeSidebar(clientX: number) {
    if (resizing.current) {
      setSidebarWidth(clampSidebarWidth(clientX));
    }
  }

  return (
    <CapabilityProvider value={context}>
      <div
        className="min-h-screen transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:grid"
        style={{
          backgroundColor:
            space === "operations"
              ? "var(--color-brand-navy)"
              : "var(--color-brand-orange)",
          gridTemplateColumns: `${sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth}px minmax(0, 1fr)`,
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          context={context}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onPointerResize={resizeSidebar}
          onResize={(clientX) => setSidebarWidth(clampSidebarWidth(clientX))}
          onResizeEnd={() => {
            resizing.current = false;
          }}
          onResizeStart={() => {
            resizing.current = true;
          }}
          space={space}
          width={sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth}
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
