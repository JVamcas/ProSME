"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const active = isActive(pathname, route.href);
  const Icon = route.icon;

  return (
    <li className="grid gap-1">
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-brand-navy transition",
          "hover:bg-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
          dark &&
            "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white",
          active &&
            !dark &&
            "bg-brand-navy text-brand-orange shadow-sm hover:bg-brand-navy",
          dark && active && "bg-white/12 text-white hover:bg-white/15",
        )}
        href={route.href}
        rel={route.openInNewTab ? "noopener noreferrer" : undefined}
        target={route.openInNewTab ? "_blank" : undefined}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-5 text-brand-navy",
            dark && "text-brand-orange",
            active && "text-brand-orange",
          )}
        />
        {route.label}
        {route.openInNewTab ? (
          <span className="sr-only"> (opens in a new tab)</span>
        ) : null}
      </Link>
      {route.children?.length ? (
        <ul className="ml-5 grid gap-1 border-l border-white/15 pl-3">
          {route.children.map((child) => (
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
