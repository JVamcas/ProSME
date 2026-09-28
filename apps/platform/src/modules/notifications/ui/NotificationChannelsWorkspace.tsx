"use client";

import {
  Bell,
  FolderOpen,
  Mail,
  MessageCircle,
  PencilLine,
} from "lucide-react";

import { useState } from "react";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { Badge } from "@/shared/ui/Badge";
import type { NotificationChannelSummary } from "../api/NotificationTemplateSchemas";
import { NotificationChannelEditor } from "./NotificationChannelEditor";
import { useNotificationChannels } from "./NotificationTemplateHooks";

function channelTypeLabel(channelType: string) {
  return channelType === "EMAIL" ? "Email" : channelType;
}

function ChannelIcon({ channelType }: { channelType: string }) {
  const className = "size-6 text-brand-orange";
  switch (channelType.toLowerCase()) {
    case "email":
      return <Mail aria-hidden="true" className={className} />;
    case "sms":
      return <MessageCircle aria-hidden="true" className={className} />;
    case "in_app":
    case "in-app":
      return <Bell aria-hidden="true" className={className} />;
    default:
      return <Mail aria-hidden="true" className={className} />;
  }
}

export function NotificationChannelCard({
  canUpdate,
  channel,
  onEdit,
}: {
  canUpdate: boolean;
  channel: NotificationChannelSummary;
  onEdit: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white">
      <div className="flex items-start justify-between gap-4 bg-brand-navy/2.5 p-5">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-orange/10">
            <ChannelIcon channelType={channel.channelType} />
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-navy/50">
              Notification channel
            </p>

            <h2 className="mt-1 text-xl font-bold text-brand-navy">
              {channel.displayName}
            </h2>

            <p className="mt-1 text-sm text-brand-navy/60">
              {channelTypeLabel(channel.channelType)}
            </p>
          </div>
        </div>

        <Badge variant={channel.isEnabled ? "success" : "danger"}>
          {channel.isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-brand-navy/50">
              Channel code
            </p>
            <p className="mt-1 font-semibold text-brand-navy">
              {channel.code}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-navy/50">
              Sort order
            </p>
            <p className="mt-1 font-semibold text-brand-navy">
              {channel.sortOrder}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-brand-navy/10 pt-5">
          <div className="flex flex-wrap gap-3">
            {canUpdate ? (
              <GeneralButton
                onClick={onEdit}
                variant="outlineOrange"
              >
                <PencilLine aria-hidden="true" className="size-4" />
                Edit Channel
              </GeneralButton>
            ) : null}

            <GeneralButtonLink
              href={`/admin/notifications/channels/${channel.code}`}
              variant="primary"
            >
              <FolderOpen aria-hidden="true" className="size-4" />
              Manage Templates
            </GeneralButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}


export function NotificationChannelsWorkspace({
  canUpdate,
}: {
  canUpdate: boolean;
}) {
  const query = useNotificationChannels();
  const [editingChannel, setEditingChannel] =
    useState<NotificationChannelSummary | null>(null);
  if (query.isPending) return <PortalLoadingState title="" description="Just a moment..." />
  if (query.error) {
    return <PortalErrorState title={query.error.name} description={query.error.message} />
  }
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        {query.data?.map((channel) => (
          <NotificationChannelCard
            canUpdate={canUpdate}
            channel={channel}
            key={channel.code}
            onEdit={() => setEditingChannel(channel)}
          />
        ))}
      </div>
      <NotificationChannelEditor
        channel={editingChannel}
        onClose={() => setEditingChannel(null)}
      />
    </>
  );
}
