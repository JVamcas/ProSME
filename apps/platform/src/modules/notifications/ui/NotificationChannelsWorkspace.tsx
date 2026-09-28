"use client";

import { Mail } from "lucide-react";
import Link from "next/link";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { Badge } from "@/shared/ui/Badge";
import { useNotificationChannels } from "./NotificationTemplateHooks";

export function NotificationChannelsWorkspace() {
  const query = useNotificationChannels();
  if (query.isPending) return <PortalLoadingState title="" description="Just a moment..." />
  if (query.error) {
    return <PortalErrorState title={query.error.name} description={query.error.message} />
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {query.data?.map((channel) => (
        <Link
          className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm transition hover:border-brand-orange/40"
          href={`/admin/notifications/channels/${channel.code}`}
          key={channel.code}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
                <Mail className="size-5" />
              </span>
              <div>
                <h2 className="font-bold text-brand-navy">{channel.displayName}</h2>
                <p className="text-sm text-brand-navy/60">{channel.code}</p>
              </div>
            </div>
            <Badge variant={channel.isEnabled ? "success" : "outline"}>
              {channel.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-5 text-sm text-brand-navy/70">
            {channel.targetCount} template targets
          </p>
        </Link>
      ))}
    </div>
  );
}
