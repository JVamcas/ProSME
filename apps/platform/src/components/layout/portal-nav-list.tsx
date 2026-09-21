"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import type { PortalRoute } from "./portal-navigation";

function isActive(pathname: string, href: string) {
  return href === "/portal" || href === "/admin"
    ? pathname === href
    : pathname.startsWith(href);
}

function ChildRouteLink({
  dark,
  pathname,
  route,
}: {
  dark: boolean;
  pathname: string;
  route: PortalRoute;
}) {
  const active = isActive(pathname, route.href);
  const Icon = route.icon;

  return (
    <li>
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-brand-navy/80 transition",
          "hover:bg-brand-navy/10 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
          dark &&
            "text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-white",
          active &&
            !dark &&
            "bg-brand-navy text-brand-orange hover:bg-brand-navy",
          dark && active && "bg-white/12 text-white hover:bg-white/15",
        )}
        href={route.href}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-4 text-brand-navy",
            dark && "text-brand-orange",
          )}
        />
        {route.label}
      </Link>
    </li>
  );
}

function PortalRouteItem({
  dark,
  pathname,
  route,
}: {
  dark: boolean;
  pathname: string;
  route: PortalRoute;
}) {
  const generatedId = useId();
  const [expanded, setExpanded] = useState(false);
  const active = isActive(pathname, route.href);
  const children = route.children ?? [];
  const hasChildren = children.length > 0;
  const Icon = route.icon;
  const childListId = `${route.id}-children-${generatedId}`;
  const itemClassName = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-navy transition",
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
          "size-5 text-brand-navy",
          dark && "text-brand-orange",
          active && "text-brand-orange",
        )}
      />
      <span className="flex-1">{route.label}</span>
    </>
  );

  return (
    <li className="grid gap-1">
      {hasChildren ? (
        <button
          aria-controls={childListId}
          aria-expanded={expanded}
          className={itemClassName}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {content}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      ) : (
        <Link
          aria-current={active ? "page" : undefined}
          className={itemClassName}
          href={route.href}
          rel={route.openInNewTab ? "noopener noreferrer" : undefined}
          target={route.openInNewTab ? "_blank" : undefined}
        >
          {content}
          {route.openInNewTab ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
        </Link>
      )}
      {hasChildren && expanded ? (
        <ul
          className="ml-5 grid gap-1 border-l border-white/15 pl-3"
          id={childListId}
        >
          {children.map((child) => (
            <ChildRouteLink
              dark={dark}
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
  dark = false,
  routes,
}: {
  dark?: boolean;
  routes: readonly PortalRoute[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal navigation">
      <ul className="grid gap-1.5">
        {routes.map((route) => (
          <PortalRouteItem
            dark={dark}
            key={route.id}
            pathname={pathname}
            route={route}
          />
        ))}
      </ul>
    </nav>
  );
}
