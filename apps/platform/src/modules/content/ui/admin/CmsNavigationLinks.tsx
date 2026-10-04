"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  sidebarHiddenLabelClassName,
  sidebarIconClassName,
  sidebarItemClassName,
  sidebarLabelClassName,
} from "@/shared/ui/navigation/SidebarItemStyles";

export default function CmsNavigationLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === "/cms" ||
    pathname === "/cms/home" ||
    pathname === "/cms/globals/homepage";

  return (
    <nav aria-label="Content management navigation">
      <Link
        aria-current={active ? "page" : undefined}
        className={sidebarItemClassName({ active, collapsed, dark: true })}
        href="/cms/home"
        onNavigate={onNavigate}
        title={collapsed ? "Home Page" : undefined}
      >
        <House aria-hidden="true" className={sidebarIconClassName} />
        <span
          className={
            collapsed ? sidebarHiddenLabelClassName : sidebarLabelClassName
          }
        >
          Home Page
        </span>
      </Link>
    </nav>
  );
}
