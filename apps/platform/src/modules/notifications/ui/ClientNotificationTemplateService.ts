"use client";

import { requestData } from "@/lib/client-http";
import type {
  NotificationTemplateEdit,
  NotificationChannelDetail,
  NotificationChannelSummary,
  NotificationChannelUpdate,
  NotificationTemplateImportResult,
  NotificationTemplateTargetDetail,
  NotificationTemplateVersionSummary,
} from "../api/NotificationTemplateSchemas";

function channelPath(channelCode: string) {
  return `/api/admin/notifications/channels/${encodeURIComponent(channelCode)}`;
}

function targetPath(channelCode: string, targetId: string) {
  return `${channelPath(channelCode)}/templates/${encodeURIComponent(targetId)}`;
}

export type NotificationTemplateImportValues = {
  file: File;
  plainTextTemplate: string;
  subjectTemplate: string;
};

function listChannels() {
  return requestData<NotificationChannelSummary[]>(
    "/api/admin/notifications/channels",
    { cache: "no-store" },
  );
}

function getChannel(channelCode: string) {
  return requestData<NotificationChannelDetail>(channelPath(channelCode), {
    cache: "no-store",
  });
}

function updateChannel(
  channelCode: string,
  input: NotificationChannelUpdate,
) {
  return requestData<NotificationChannelSummary>(channelPath(channelCode), {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

function getTarget(channelCode: string, targetId: string) {
  return requestData<NotificationTemplateTargetDetail>(
    targetPath(channelCode, targetId),
    { cache: "no-store" },
  );
}

function importTemplate(
  channelCode: string,
  targetId: string,
  values: NotificationTemplateImportValues,
) {
  const body = new FormData();
  body.set("file", values.file);
  body.set("subjectTemplate", values.subjectTemplate);
  if (values.plainTextTemplate.trim()) {
    body.set("plainTextTemplate", values.plainTextTemplate);
  }
  return requestData<NotificationTemplateImportResult>(
    targetPath(channelCode, targetId),
    { body, method: "POST" },
  );
}

function publishTemplate(
  channelCode: string,
  targetId: string,
  versionId: string,
) {
  return requestData<NotificationTemplateVersionSummary>(
    `${targetPath(channelCode, targetId)}/versions/${encodeURIComponent(versionId)}/publish`,
    { method: "POST" },
  );
}

function editTemplate(
  channelCode: string,
  targetId: string,
  versionId: string,
  input: NotificationTemplateEdit,
) {
  return requestData<NotificationTemplateVersionSummary>(
    `${targetPath(channelCode, targetId)}/versions/${encodeURIComponent(versionId)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export const clientNotificationTemplateService = {
  editTemplate,
  getChannel,
  getTarget,
  importTemplate,
  listChannels,
  publishTemplate,
  updateChannel,
};
