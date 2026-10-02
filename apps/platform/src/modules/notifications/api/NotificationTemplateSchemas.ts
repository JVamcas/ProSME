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

export const notificationChannelUpdateSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  isEnabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}).strict();

export type NotificationChannelUpdate = z.infer<
  typeof notificationChannelUpdateSchema
>;

export type NotificationChannelSummary = {
  channelType: "EMAIL";
  code: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
  targetCount: number;
  updatedAt: string;
};

export type NotificationTemplateTargetSummary = {
  allowedFields: readonly string[];
  catalogKey: string | null;
  catalogName: string | null;
  defaultSubjectTemplate: string;
  description: string;
  eventKey: string | null;
  id: string;
  isEnabled: boolean;
  label: string;
  lastUpdatedAt: string;
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

export const notificationTemplateEditSchema = z.object({
  subjectTemplate: z.string().trim().min(1).max(500).refine(
    (value) => !/[\r\n]/.test(value),
    "The subject cannot contain newlines.",
  ),
}).strict();

export type NotificationTemplateEdit = z.infer<
  typeof notificationTemplateEditSchema
>;
