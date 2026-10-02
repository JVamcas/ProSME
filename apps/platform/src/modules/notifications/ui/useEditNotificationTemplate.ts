"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NotificationTemplateEdit } from "../api/NotificationTemplateSchemas";
import { clientNotificationTemplateService } from "./ClientNotificationTemplateService";
import { notificationTemplateQueryKeys } from "./NotificationTemplateHooks";

export function useEditNotificationTemplate(channelCode: string, targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, input }: {
      versionId: string;
      input: NotificationTemplateEdit;
    }) => clientNotificationTemplateService.editTemplate(
      channelCode,
      targetId,
      versionId,
      input,
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationTemplateQueryKeys.channel(channelCode),
      });
      void queryClient.invalidateQueries({
        queryKey: notificationTemplateQueryKeys.target(channelCode, targetId),
      });
    },
  });
}
