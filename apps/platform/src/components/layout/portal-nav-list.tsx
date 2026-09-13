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

export function PortalNavList({ routes }: { routes: readonly PortalRoute[] }) {
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
                  active && "bg-brand-navy text-brand-orange shadow-sm hover:bg-brand-navy",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-5 text-brand-navy",
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
