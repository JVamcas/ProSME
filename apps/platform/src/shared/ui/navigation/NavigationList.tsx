"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import { GeneralButton } from "@/shared/ui/Button";
import {
  sidebarItemClassName,
  sidebarIconClassName,
  sidebarLabelClassName,
  sidebarHiddenLabelClassName,
} from "./SidebarItemStyles";
import { NavigationPendingIndicator } from "../portal/NavigationPendingIndicator";
import type { LucideIcon } from "lucide-react";
import {
  groupNavigationRoutes,
  type NavigationSectionId,
} from "./NavigationSections";
import styles from "./NavigationList.module.css";

export type NavigationRoute = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  openInNewTab?: boolean;
  children?: readonly NavigationRoute[];
  section?: NavigationSectionId;
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
        <GeneralButton
          aria-controls={childListId}
          aria-expanded={childrenVisible}
          className={cn(
            itemClassName,
            "h-auto rounded-[10px] focus-visible:ring-0",
          )}
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
          size={null}
          variant={null}
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
        </GeneralButton>
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
          className={cn(styles.list, styles.nested)}
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

function NavigationSectionItem({
  collapsed,
  dark,
  group,
  onRequestExpand,
  onNavigate,
  pathname,
}: {
  collapsed: boolean;
  dark: boolean;
  group: { id: string; label?: string; routes: NavigationRoute[] };
  onRequestExpand?: () => void;
  onNavigate?: (href: string) => void;
  pathname: string;
}) {
  const generatedId = useId();
  const listId = `${group.id}-routes-${generatedId}`;
  const [expansionOverride, setExpansionOverride] =
    useState<ExpansionOverride | null>(null);
  const expanded =
    expansionOverride?.pathname === pathname
      ? expansionOverride.expanded
      : true;
  const routesVisible = collapsed || !group.label || expanded;

  return (
    <li className={styles.section} aria-label={group.label}>
      {group.label && !collapsed ? (
        <GeneralButton
          aria-controls={listId}
          aria-expanded={expanded}
          className={cn(
            styles.heading,
            "h-auto rounded-lg font-bold focus-visible:ring-0",
          )}
          onClick={() => {
            setExpansionOverride({ expanded: !expanded, pathname });
          }}
          type="button"
          size={null}
          variant={null}
        >
          <span>{group.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </GeneralButton>
      ) : null}
      {group.label && collapsed ? (
        <p className={sidebarHiddenLabelClassName}>{group.label}</p>
      ) : null}
      <ul
        className={cn(
          styles.list,
          group.label && !collapsed && styles.sectionChildren,
        )}
        hidden={!routesVisible}
        id={listId}
      >
        {group.routes.map((route) => (
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
      <ul className={styles.list}>
        {groupNavigationRoutes(routes).map((group) => (
          <NavigationSectionItem
            collapsed={collapsed}
            dark={dark}
            group={group}
            key={group.id}
            onRequestExpand={onRequestExpand}
            onNavigate={onNavigate}
            pathname={pathname}
          />
        ))}
      </ul>
    </nav>
  );
}
