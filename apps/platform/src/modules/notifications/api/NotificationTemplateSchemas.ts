import { z } from "zod";

import type { NotificationTemplateScope, NotificationTemplateState } from "../domain/NotificationTemplate";

export const notificationChannelCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Z][A-Z0-9_]*$/);
export const notificationTemplateTargetIdSchema = z.uuid();
export const notificationTemplateVersionIdSchema = z.uuid();
export const notificationTemplateImportFieldsSchema = z.object({
  plainTextTemplate: z.string().max(262_144).optional(),
  subjectTemplate: z.string().trim().min(1).max(500),
}).strict();

export type NotificationChannelSummary = {
  channelType: "EMAIL";
  code: string;
  displayName: string;
  isEnabled: boolean;
  targetCount: number;
};

export type NotificationTemplateTargetSummary = {
  allowedFields: readonly string[];
  catalogKey: string | null;
  eventKey: string | null;
  id: string;
  isEnabled: boolean;
  label: string;
  publishedVersionNumber: number | null;
  scope: NotificationTemplateScope;
  versionCount: number;
};

export type NotificationChannelDetail = {
  channel: NotificationChannelSummary;
  targets: NotificationTemplateTargetSummary[];
};

export type NotificationTemplateVersionSummary = {
  contentSha256: string;
  createdAt: string;
  id: string;
  mediaType: string;
  publishedAt: string | null;
  sourceFileName: string;
  status: NotificationTemplateState;
  subjectTemplate: string;
  versionNumber: number;
};

export type NotificationTemplateTargetDetail = {
  allowedFields: readonly string[];
  channelCode: string;
  target: NotificationTemplateTargetSummary;
  versions: NotificationTemplateVersionSummary[];
};

export type NotificationTemplateImportResult = {
  detectedPlaceholders: string[];
  version: NotificationTemplateVersionSummary;
};
