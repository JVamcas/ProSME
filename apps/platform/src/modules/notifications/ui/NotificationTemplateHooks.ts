"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  clientNotificationTemplateService,
  type NotificationTemplateImportValues,
} from "./ClientNotificationTemplateService";
import type {
  NotificationChannelSummary,
  NotificationTemplateTargetDetail,
  NotificationChannelUpdate,
} from "../api/NotificationTemplateSchemas";

export const notificationTemplateQueryKeys = {
  all: ["admin", "notifications"] as const,
  channels: ["admin", "notifications", "channels"] as const,
  channel: (channelCode: string) =>
    ["admin", "notifications", "channels", channelCode] as const,
  channelSearch: (channelCode: string, search: string) =>
    ["admin", "notifications", "channels", channelCode, { search }] as const,
  target: (channelCode: string, targetId: string) =>
    [
      "admin",
      "notifications",
      "channels",
      channelCode,
      "templates",
      targetId,
    ] as const,
};

export function useNotificationChannels() {
  return useQuery({
    queryFn: clientNotificationTemplateService.listChannels,
    queryKey: notificationTemplateQueryKeys.channels,
  });
}

export function useNotificationChannel(channelCode: string, search = "") {
  const term = search.trim();
  return useQuery({
    enabled: Boolean(channelCode),
    placeholderData: keepPreviousData,
    queryFn: () =>
      clientNotificationTemplateService.getChannel(channelCode, {
        search: term,
      }),
    queryKey: term
      ? notificationTemplateQueryKeys.channelSearch(channelCode, term)
      : notificationTemplateQueryKeys.channel(channelCode),
  });
}

export function useUpdateNotificationChannel(channelCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationChannelUpdate) =>
      clientNotificationTemplateService.updateChannel(channelCode, input),
    onSuccess: (channel) => {
      queryClient.setQueryData(
        notificationTemplateQueryKeys.channels,
        (current: NotificationChannelSummary[] | undefined) =>
          current?.map((item) => (item.code === channel.code ? channel : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: notificationTemplateQueryKeys.channel(channelCode),
      });
    },
  });
}

export function useNotificationTemplateTarget(
  channelCode: string,
  targetId: string,
  initialData?: NotificationTemplateTargetDetail,
) {
  return useQuery({
    enabled: Boolean(channelCode && targetId),
    initialData,
    queryFn: () =>
      clientNotificationTemplateService.getTarget(channelCode, targetId),
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
