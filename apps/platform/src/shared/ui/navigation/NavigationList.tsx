"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import {
  sidebarItemClassName,
  sidebarIconClassName,
  sidebarLabelClassName,
  sidebarHiddenLabelClassName,
} from "./SidebarItemStyles";
import { NavigationPendingIndicator } from "../portal/NavigationPendingIndicator";
import type { LucideIcon } from "lucide-react";

export type NavigationRoute = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  openInNewTab?: boolean;
  children?: readonly NavigationRoute[];
};

function isActive(pathname: string, href: string) {
  return href === "/portal" || href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function routeOrDescendantIsActive(
  pathname: string,
  route: NavigationRoute,
): boolean {
  return (
    isActive(pathname, route.href) ||
    Boolean(
      route.children?.some((child) =>
        routeOrDescendantIsActive(pathname, child),
      ),
    )
  );
}

type ExpansionOverride = {
  expanded: boolean;
  pathname: string;
};

function NavigationRouteItem({
  collapsed,
  dark,
  depth,
  onRequestExpand,
  onNavigate,
  pathname,
  route,
}: {
  collapsed: boolean;
  dark: boolean;
  depth: number;
  onRequestExpand?: () => void;
  onNavigate?: (href: string) => void;
  pathname: string;
  route: NavigationRoute;
}) {
  const generatedId = useId();
  const children = route.children ?? [];
  const hasChildren = children.length > 0;
  const descendantActive = children.some((child) =>
    routeOrDescendantIsActive(pathname, child),
  );
  const [expansionOverride, setExpansionOverride] =
    useState<ExpansionOverride | null>(null);
  const childrenVisible =
    expansionOverride?.pathname === pathname
      ? expansionOverride.expanded
      : descendantActive;
  const active = isActive(pathname, route.href) || descendantActive;
  const Icon = route.icon;
  const childListId = `${route.id}-children-${generatedId}`;
  const isTopLevel = depth === 0;
  const itemClassName = sidebarItemClassName({
    active,
    collapsed,
    dark,
    nested: !isTopLevel,
  });
  const content = (
    <>
      <Icon aria-hidden="true" className={sidebarIconClassName} />
      <span
        className={
          collapsed ? sidebarHiddenLabelClassName : sidebarLabelClassName
        }
      >
        {route.label}
      </span>
    </>
  );

  return (
    <li className="grid gap-1">
      {hasChildren ? (
        <button
          aria-controls={childListId}
          aria-expanded={childrenVisible}
          className={itemClassName}
          onClick={() => {
            if (collapsed) {
              setExpansionOverride({ expanded: true, pathname });
              onRequestExpand?.();
              return;
            }

            setExpansionOverride({
              expanded: !childrenVisible,
              pathname,
            });
          }}
          title={collapsed ? route.label : undefined}
          type="button"
        >
          {content}
          {!collapsed ? (
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 transition-transform",
                childrenVisible && "rotate-180",
              )}
            />
          ) : null}
        </button>
      ) : (
        <Link
          aria-current={active ? "page" : undefined}
          className={itemClassName}
          href={route.href}
          onNavigate={() => onNavigate?.(route.href)}
          rel={route.openInNewTab ? "noopener noreferrer" : undefined}
          target={route.openInNewTab ? "_blank" : undefined}
          title={collapsed ? route.label : undefined}
        >
          {content}
          <NavigationPendingIndicator />
          {route.openInNewTab ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
        </Link>
      )}
      {hasChildren && childrenVisible && !collapsed ? (
        <ul
          className="ml-5 grid gap-1 border-l border-white/15 pl-3"
          id={childListId}
        >
          {children.map((child) => (
            <NavigationRouteItem
              collapsed={false}
              dark={dark}
              depth={depth + 1}
              key={child.id}
              onNavigate={onNavigate}
              pathname={pathname}
              route={child}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function NavigationList({
  collapsed = false,
  dark = false,
  onRequestExpand,
  onNavigate,
  label = "Portal navigation",
  routes,
}: {
  collapsed?: boolean;
  dark?: boolean;
  onRequestExpand?: () => void;
  onNavigate?: (href: string) => void;
  label?: string;
  routes: readonly NavigationRoute[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="grid gap-1.5">
        {routes.map((route) => (
          <NavigationRouteItem
            collapsed={collapsed}
            dark={dark}
            depth={0}
            key={route.id}
            onRequestExpand={onRequestExpand}
            onNavigate={onNavigate}
            pathname={pathname}
            route={route}
          />
        ))}
      </ul>
    </nav>
  );
}
