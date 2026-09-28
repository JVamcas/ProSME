"use client";

import Link from "next/link";

import { Badge } from "@/shared/ui/Badge";
import { useNotificationCatalogs } from "./useNotificationAdministration";

export function NotificationCatalogList() {
  const query = useNotificationCatalogs();
  if (query.isPending) return <p>Loading event catalogs…</p>;
  if (query.error) return <p className="text-sm text-red-700" role="alert">{query.error.message}</p>;
  if (!query.data?.length) return <p>No notification event catalogs are configured.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {query.data.map((catalog) => (
        <Link
          className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm hover:border-brand-orange/40"
          href={`/admin/notifications/event-catalogs/${encodeURIComponent(catalog.catalogKey)}`}
          key={catalog.catalogKey}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-brand-navy">{catalog.displayName}</h2>
              <p className="text-sm text-brand-navy/55">{catalog.catalogKey}</p>
            </div>
            <Badge variant={catalog.isEnabled ? "success" : "outline"}>
              {catalog.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-brand-navy/70">{catalog.description}</p>
          <p className="mt-4 text-xs font-semibold text-brand-navy/60">
            {catalog.eventCount} immutable events · sort order {catalog.sortOrder}
          </p>
        </Link>
      ))}
    </div>
  );
}
