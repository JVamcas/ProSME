"use client";

import {
  Breadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link,
} from "react-aria-components";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-brand-navy/70">
      <AriaBreadcrumbs className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => (
          <Breadcrumb
            key={`${item.label}-${index}`}
            className="
              inline-flex min-w-0 items-center
              before:mx-2 before:text-brand-navy/35 before:content-['/']
              first:before:hidden
            "
          >
            {({ isCurrent }) => (
              item.href ? (
                <Link
                  className="inline-flex min-h-8 items-center hover:underline"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className="inline-flex min-h-8 items-center">
                  {item.label}
                </span>
              )
            )}
          </Breadcrumb>
        ))}
      </AriaBreadcrumbs>
    </nav>
  );
}
