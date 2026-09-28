"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import type { PortalRoute } from "./portal-navigation";

function isActive(pathname: string, href: string) {
  return href === "/portal" || href === "/admin"
    ? pathname === href
    : pathname.startsWith(href);
}

function routeOrDescendantIsActive(pathname: string, route: PortalRoute): boolean {
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

function PortalRouteItem({
  collapsed,
  dark,
  depth,
  onRequestExpand,
  pathname,
  route,
}: {
  collapsed: boolean;
  dark: boolean;
  depth: number;
  onRequestExpand?: () => void;
  pathname: string;
  route: PortalRoute;
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
  const itemClassName = cn(
    "flex w-full items-center rounded-xl py-2 text-left text-brand-navy transition",
    isTopLevel ? "min-h-11 text-sm font-semibold" : "min-h-10 text-sm font-medium",
    collapsed ? "justify-center px-2" : "gap-3 px-3",
    "hover:bg-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
    dark &&
      "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white",
    active &&
      !dark &&
      "bg-brand-navy text-brand-orange shadow-sm hover:bg-brand-navy",
    dark && active && "bg-white/12 text-white hover:bg-white/15",
  );
  const content = (
    <>
      <Icon
        aria-hidden="true"
        className={cn(
          isTopLevel ? "size-5" : "size-4",
          "text-brand-navy",
          dark && "text-brand-orange",
          active && "text-brand-orange",
        )}
      />
      <span className={collapsed ? "sr-only" : "flex-1"}>{route.label}</span>
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
          rel={route.openInNewTab ? "noopener noreferrer" : undefined}
          target={route.openInNewTab ? "_blank" : undefined}
          title={collapsed ? route.label : undefined}
        >
          {content}
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
            <PortalRouteItem
              collapsed={false}
              dark={dark}
              depth={depth + 1}
              key={child.id}
              pathname={pathname}
              route={child}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PortalNavList({
  collapsed = false,
  dark = false,
  onRequestExpand,
  routes,
}: {
  collapsed?: boolean;
  dark?: boolean;
  onRequestExpand?: () => void;
  routes: readonly PortalRoute[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal navigation">
      <ul className="grid gap-1.5">
        {routes.map((route) => (
          <PortalRouteItem
            collapsed={collapsed}
            dark={dark}
            depth={0}
            key={route.id}
            onRequestExpand={onRequestExpand}
            pathname={pathname}
            route={route}
          />
        ))}
      </ul>
    </nav>
  );
}
