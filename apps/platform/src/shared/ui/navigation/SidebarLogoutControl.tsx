"use client";

import { LogOutIcon } from "lucide-react";
import { GeneralButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  sidebarHiddenLabelClassName,
  sidebarIconClassName,
  sidebarItemClassName,
  sidebarLogoutClassName,
} from "./SidebarItemStyles";
import styles from "./NavigationSidebar.module.css";

export function SidebarLogoutControl({
  collapsed = false,
  dark = true,
  onLogout,
  pending,
  surface,
}: {
  collapsed?: boolean;
  dark?: boolean;
  onLogout: () => void;
  pending: boolean;
  surface?: "light";
}) {
  return (
    <GeneralButton
      className={cn(
        sidebarItemClassName({ collapsed, dark }),
        sidebarLogoutClassName,
        surface === "light" && styles.light,
        "text-[color:var(--sidebar-text)]",
        "hover:text-[color:var(--sidebar-name)]",
        "hover:bg-transparent",
        collapsed ? "justify-center" : "justify-start",
      )}
      disabled={pending}
      onClick={onLogout}
      title={collapsed ? "Logout" : undefined}
      type="button"
      variant="ghost"
    >
      <LogOutIcon aria-hidden="true" className={sidebarIconClassName} />
      <span className={collapsed ? sidebarHiddenLabelClassName : undefined}>
        {pending ? "Logging out…" : "Logout"}
      </span>
    </GeneralButton>
  );
}
