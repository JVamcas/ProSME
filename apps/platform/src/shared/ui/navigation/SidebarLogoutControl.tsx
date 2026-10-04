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

export function SidebarLogoutControl({
  collapsed = false,
  dark = true,
  onLogout,
  pending,
}: {
  collapsed?: boolean;
  dark?: boolean;
  onLogout: () => void;
  pending: boolean;
}) {
  return (
    <GeneralButton
      className={cn(
        sidebarItemClassName({ collapsed, dark }),
        sidebarLogoutClassName,
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
