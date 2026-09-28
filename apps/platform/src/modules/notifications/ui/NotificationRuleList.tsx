"use client";

import Link from "next/link";

import { Badge } from "@/shared/ui/Badge";
import { useNotificationRules } from "./useNotificationAdministration";

export function NotificationRuleList() {
  const query = useNotificationRules();
  if (query.isPending) return <p>Loading event rules…</p>;
  if (query.error) return <p className="text-sm text-red-700" role="alert">{query.error.message}</p>;
  if (!query.data?.length) return <p>No notification event rules are configured.</p>;
  const catalogs = Map.groupBy(query.data, (rule) => rule.catalogName);
  return (
    <div className="space-y-6">
      {[...catalogs.entries()].map(([catalog, rules]) => (
        <section className="rounded-2xl border border-brand-navy/10 bg-white p-5" key={catalog}>
          <h2 className="text-lg font-bold text-brand-navy">{catalog}</h2>
          <div className="mt-3 divide-y divide-brand-navy/10">
            {rules.map((rule) => (
              <Link
                className="flex items-center justify-between gap-4 py-4 hover:text-brand-orange"
                href={`/admin/notifications/event-rules/${encodeURIComponent(rule.eventKey)}`}
                key={rule.eventKey}
              >
                <div>
                  <p className="font-semibold">{rule.eventName}</p>
                  <p className="font-mono text-xs text-brand-navy/55">{rule.eventKey}</p>
                  <p className="mt-1 text-sm text-brand-navy/65">{rule.recipientCount} recipient rules</p>
                </div>
                <Badge variant={rule.isEnabled ? "success" : "outline"}>
                  {rule.isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
