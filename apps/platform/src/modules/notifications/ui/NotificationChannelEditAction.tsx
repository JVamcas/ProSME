"use client";

import { PencilLine } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { NotificationChannelEditor } from "./NotificationChannelEditor";
import { useNotificationChannel } from "./NotificationTemplateHooks";

export function NotificationChannelEditAction({
  channelCode,
}: {
  channelCode: string;
}) {
  const [editing, setEditing] = useState(false);
  const query = useNotificationChannel(channelCode);
  const channel = query.data?.channel ?? null;

  return (
    <>
      <GeneralButton
        disabled={!channel}
        onClick={() => setEditing(true)}
        variant="outline"
      >
        <PencilLine aria-hidden="true" className="size-4" />
        Edit Channel
      </GeneralButton>
      <NotificationChannelEditor
        channel={editing ? channel : null}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
