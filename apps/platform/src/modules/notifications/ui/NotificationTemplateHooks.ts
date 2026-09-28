"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clientNotificationTemplateService,
  type NotificationTemplateImportValues,
} from "./ClientNotificationTemplateService";

export const notificationTemplateQueryKeys = {
  all: ["admin", "notifications"] as const,
  channels: ["admin", "notifications", "channels"] as const,
  channel: (channelCode: string) => [
    "admin", "notifications", "channels", channelCode,
  ] as const,
  target: (channelCode: string, targetId: string) => [
    "admin", "notifications", "channels", channelCode, "templates", targetId,
  ] as const,
};

export function useNotificationChannels() {
  return useQuery({
    queryFn: clientNotificationTemplateService.listChannels,
    queryKey: notificationTemplateQueryKeys.channels,
  });
}

export function useNotificationChannel(channelCode: string) {
  return useQuery({
    enabled: Boolean(channelCode),
    queryFn: () => clientNotificationTemplateService.getChannel(channelCode),
    queryKey: notificationTemplateQueryKeys.channel(channelCode),
  });
}

export function useNotificationTemplateTarget(
  channelCode: string,
  targetId: string,
) {
  return useQuery({
    enabled: Boolean(channelCode && targetId),
    queryFn: () => clientNotificationTemplateService.getTarget(
      channelCode,
      targetId,
    ),
    queryKey: notificationTemplateQueryKeys.target(channelCode, targetId),
  });
}

export function useImportNotificationTemplate(
  channelCode: string,
  targetId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NotificationTemplateImportValues) =>
      clientNotificationTemplateService.importTemplate(
        channelCode,
        targetId,
        values,
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

export function usePublishNotificationTemplate(
  channelCode: string,
  targetId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      clientNotificationTemplateService.publishTemplate(
        channelCode,
        targetId,
        versionId,
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
