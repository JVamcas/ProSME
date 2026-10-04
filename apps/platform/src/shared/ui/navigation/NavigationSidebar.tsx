"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarUserSummary } from "./SidebarUserSummary";
import styles from "./NavigationSidebar.module.css";

export function NavigationSidebar({
  children,
  className,
  collapsed = false,
  dark = false,
  displayName,
  email,
  footer,
  logoHref = "/",
  onClose,
  onToggleCollapsed,
  resizeHandle,
  workspace,
}: {
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
  dark?: boolean;
  displayName: string;
  email: string;
  footer: ReactNode;
  logoHref?: string;
  onClose?: () => void;
  onToggleCollapsed: () => void;
  resizeHandle?: ReactNode;
  workspace?: ReactNode;
}) {
  return (
    <div
      className={cn(styles.frame, dark ? styles.dark : styles.brand, className)}
      data-collapsed={collapsed}
      data-sidebar-frame
    >
      <SidebarHeader
        collapsed={collapsed}
        dark={dark}
        logoHref={logoHref}
        onClose={onClose}
        onToggleCollapsed={onToggleCollapsed}
      />
      <div className={styles.summary} data-sidebar-slot="user">
        <SidebarUserSummary
          collapsed={collapsed}
          dark={dark}
          displayName={displayName}
          email={email}
        />
      </div>
      {workspace && !collapsed ? (
        <div className={styles.workspace}>{workspace}</div>
      ) : null}
      <div className={styles.navigation} data-sidebar-slot="navigation">
        {children}
      </div>
      <div className={styles.footer} data-sidebar-slot="footer">
        {footer}
      </div>
      {resizeHandle}
    </div>
  );
}
