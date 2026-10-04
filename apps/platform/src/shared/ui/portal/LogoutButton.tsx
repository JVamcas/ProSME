"use client";

import { useLogout } from "@/platform/auth/ui/useLogout";
import { SidebarLogoutControl } from "../navigation/SidebarLogoutControl";

export function LogoutButton({
  collapsed = false,
  tone = "dark",
}: {
  collapsed?: boolean;
  tone?: "brand" | "dark";
}) {
  const logout = useLogout();

  return (
    <SidebarLogoutControl
      collapsed={collapsed}
      dark={tone === "dark"}
      onLogout={() => logout.mutate()}
      pending={logout.isPending}
    />
  );
}
