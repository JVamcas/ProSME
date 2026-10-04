"use client";

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/shared/ui/Logo";
import styles from "./NavigationSidebar.module.css";

export function SidebarHeader({
  collapsed,
  dark,
  logoHref,
  onClose,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  dark: boolean;
  logoHref: string;
  onClose?: () => void;
  onToggleCollapsed: () => void;
}) {
  const toggleLabel = collapsed
    ? "Expand navigation sidebar"
    : "Collapse navigation sidebar";

  return (
    <div className={styles.header} data-sidebar-slot="header">
      {!collapsed ? (
        <Logo className={styles.logo} href={logoHref} compact inverted={dark} />
      ) : null}
      <button
        aria-label={toggleLabel}
        className={cn(styles.toggle, styles.desktopToggle)}
        onClick={onToggleCollapsed}
        title={toggleLabel}
        type="button"
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden="true" />
        ) : (
          <PanelLeftClose aria-hidden="true" />
        )}
      </button>
      {onClose ? (
        <button
          aria-label="Close navigation sidebar"
          className={cn(styles.toggle, styles.mobileToggle)}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
