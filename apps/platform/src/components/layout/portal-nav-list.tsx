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
        {routes.map(({ href, icon: Icon, id, label, openInNewTab }) => {
          const active = isActive(pathname, href);

          return (
            <li key={id}>
              <Link
                href={href}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                target={openInNewTab ? "_blank" : undefined}
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
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-5 text-brand-navy",
                    dark && "text-brand-orange",
                    active && "text-brand-orange",
                  )}
                />
                {label}
                {openInNewTab ? (
                  <span className="sr-only"> (opens in a new tab)</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
