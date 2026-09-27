"use client";

import Link from "next/link";

import type { NotificationTemplateTargetSummary } from "../api/NotificationTemplateSchemas";
import { Badge } from "@/shared/ui/Badge";
import { useNotificationChannel } from "./NotificationTemplateHooks";

const scopeLabels = {
  GLOBAL: "Global fallback",
  CATALOG: "Catalog fallbacks",
  EVENT: "Event templates",
} as const;

function TargetCard({
  channelCode,
  target,
}: {
  channelCode: string;
  target: NotificationTemplateTargetSummary;
}) {
  return (
    <Link
      className="block rounded-xl border border-brand-navy/10 bg-white p-4 transition hover:border-brand-orange/40"
      href={`/admin/notifications/channels/${channelCode}/templates/${target.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-brand-navy">{target.label}</h3>
          <p className="mt-1 text-xs text-brand-navy/55">
            {target.versionCount} versions
          </p>
        </div>
        <Badge variant={target.publishedVersionNumber ? "success" : "outline"}>
          {target.publishedVersionNumber
            ? `Published v${target.publishedVersionNumber}`
            : "Not published"}
        </Badge>
      </div>
    </Link>
  );
}

export function NotificationChannelWorkspace({ channelCode }: { channelCode: string }) {
  const query = useNotificationChannel(channelCode);
  if (query.isPending) return <p>Loading template targets…</p>;
  if (query.error) {
    return <p className="text-sm text-red-700" role="alert">{query.error.message}</p>;
  }
  return (
    <div className="space-y-6">
      {(["GLOBAL", "CATALOG", "EVENT"] as const).map((scope) => {
        const targets = query.data?.targets.filter((target) => target.scope === scope) ?? [];
        return (
          <section className="rounded-2xl bg-brand-cream/50 p-5" key={scope}>
            <h2 className="mb-4 text-lg font-bold text-brand-navy">
              {scopeLabels[scope]}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {targets.map((target) => (
                <TargetCard
                  channelCode={channelCode}
                  key={target.id}
                  target={target}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
