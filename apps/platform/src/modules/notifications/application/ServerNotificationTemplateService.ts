import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  NotificationChannelDetail,
  NotificationChannelSummary,
  NotificationChannelUpdate,
  NotificationTemplateTargetDetail,
  NotificationTemplateTargetSummary,
  NotificationTemplateVersionSummary,
} from "../api/NotificationTemplateSchemas";
import { notificationChannelUpdateSchema } from "../api/NotificationTemplateSchemas";
import { notificationAuditMetadataSchema } from "../domain/NotificationAudit";
import {
  isNotificationEventKey,
  notificationEventCatalogue,
  notificationCatalogKeys,
  type NotificationCatalogKey,
  type NotificationEventKey,
} from "../domain/NotificationEvent";
import {
  fieldsForNotificationTarget,
  type NotificationTemplateFieldTarget,
} from "../domain/NotificationTemplateFields";
import {
  createNotificationTemplateDraft,
  findNotificationChannel,
  findNotificationTemplateTarget,
  findNotificationTemplateVersion,
  listNotificationChannels,
  listNotificationTemplateTargets,
  listNotificationTemplateVersions,
  publishNotificationTemplateVersion,
  resolvePublishedNotificationTemplate,
} from "../infrastructure/NotificationTemplateRepository";
import { updateNotificationChannelRecord } from "../infrastructure/NotificationAdministrationRepository";
import { authorizeNotificationOperation } from "./NotificationAuthorization";
import {
  validateNotificationHtmlImport,
  validateNotificationTemplateContent,
  type NotificationHtmlImportInput,
} from "./NotificationHtmlImport";

import { assertAuthenticationTemplate } from "../domain/AuthenticationNotificationTemplate";

function validateRequiredAction(
  target: { eventKey: string | null; catalogKey: string | null },
  content: { htmlTemplate: string; plainTextTemplate: string },
) {
  if (
    target.catalogKey === "AUTHENTICATION" ||
    (target.eventKey &&
      isNotificationEventKey(target.eventKey) &&
      notificationEventCatalogue[target.eventKey].catalogKey ===
        "AUTHENTICATION")
  ) {
    assertAuthenticationTemplate(content);
  }
}

function isoDate(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function channelSummary(channel: {
  channelType: "EMAIL";
  code: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
  targetCount: number;
  updatedAt: Date | string;
}): NotificationChannelSummary {
  return {
    ...channel,
    updatedAt:
      channel.updatedAt instanceof Date
        ? channel.updatedAt.toISOString()
        : channel.updatedAt,
  };
}

function versionSummary(version: {
  contentSha256: string;
  createdAt: Date;
  id: string;
  mediaType: string;
  publishedAt: Date | null;
  sourceFileName: string;
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  subjectTemplate: string;
  versionNumber: number;
}): NotificationTemplateVersionSummary {
  return {
    ...version,
    createdAt: version.createdAt.toISOString(),
    publishedAt: isoDate(version.publishedAt),
  };
}

function fieldTarget(target: {
  catalogKey: string | null;
  eventKey: string | null;
  scope: "GLOBAL" | "CATALOG" | "EVENT";
}): NotificationTemplateFieldTarget {
  const catalogKey = notificationCatalogKeys.includes(
    target.catalogKey as NotificationCatalogKey,
  )
    ? (target.catalogKey as NotificationCatalogKey)
    : null;
  const eventKey =
    target.eventKey && isNotificationEventKey(target.eventKey)
      ? target.eventKey
      : null;
  return { catalogKey, eventKey, scope: target.scope };
}

function targetLabel(target: {
  catalogKey: string | null;
  catalogName: string | null;
  displayName: string | null;
  eventKey: string | null;
  scope: "GLOBAL" | "CATALOG" | "EVENT";
}): string {
  if (target.scope === "EVENT")
    return target.displayName ?? target.eventKey ?? "Event";
  if (target.scope === "CATALOG") {
    return target.catalogName
      ? `${target.catalogName} Catalog Template`
      : (target.catalogKey ?? "Catalog");
  }
  return "Global Fallback";
}

function targetSummary(target: {
  catalogKey: string | null;
  catalogName: string | null;
  defaultSubjectTemplate: string;
  description: string | null;
  displayName: string | null;
  eventKey: string | null;
  id: string;
  isEnabled: boolean;
  lastVersionCreatedAt: Date | null;
  publishedVersionNumber: number | null;
  scope: "GLOBAL" | "CATALOG" | "EVENT";
  targetUpdatedAt: Date;
  versionCount: number;
}): NotificationTemplateTargetSummary {
  const lastUpdatedAt =
    target.lastVersionCreatedAt &&
    target.lastVersionCreatedAt > target.targetUpdatedAt
      ? target.lastVersionCreatedAt
      : target.targetUpdatedAt;
  return {
    allowedFields: fieldsForNotificationTarget(fieldTarget(target)),
    catalogKey: target.catalogKey,
    catalogName: target.catalogName,
    defaultSubjectTemplate: target.defaultSubjectTemplate,
    description:
      target.description ??
      (target.scope === "GLOBAL"
        ? "Fallback template used when no catalog or event-specific published version is available."
        : ""),
    eventKey: target.eventKey,
    id: target.id,
    isEnabled: target.isEnabled,
    label: targetLabel(target),
    lastUpdatedAt: lastUpdatedAt.toISOString(),
    publishedVersionNumber: target.publishedVersionNumber,
    scope: target.scope,
    versionCount: target.versionCount,
  };
}

export async function getNotificationChannels(
  user: AuthenticatedUser | null,
): Promise<NotificationChannelSummary[]> {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const channels = await listNotificationChannels();
  return channels.map(channelSummary);
}

export async function getNotificationChannel(
  user: AuthenticatedUser | null,
  channelCode: string,
): Promise<NotificationChannelDetail> {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const channel = await findNotificationChannel(channelCode);
  if (!channel) throw new ResourceNotFoundError("notification channel");
  const targets = await listNotificationTemplateTargets(channelCode);
  return {
    channel: channelSummary(channel),
    targets: targets.map(targetSummary),
  };
}

export async function updateNotificationChannel(
  user: AuthenticatedUser | null,
  channelCode: string,
  input: NotificationChannelUpdate,
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "UPDATE_CONFIGURATION");
  const update = notificationChannelUpdateSchema.parse(input);
  notificationAuditMetadataSchema.parse({ channelCode, correlationId });
  const result = await updateNotificationChannelRecord({
    actorId: actor.id,
    channelCode,
    correlationId,
    update,
  });
  if (!result) {
    const existing = await findNotificationChannel(channelCode);
    if (!existing) throw new ResourceNotFoundError("notification channel");
    throw new ResourceConflictError(
      "The notification channel changed while you were editing it. Refresh and try again.",
    );
  }
  const channel = await findNotificationChannel(channelCode);
  if (!channel) throw new ResourceNotFoundError("notification channel");
  return channelSummary(channel);
}

export async function getNotificationTemplateTarget(
  user: AuthenticatedUser | null,
  channelCode: string,
  targetId: string,
): Promise<NotificationTemplateTargetDetail> {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const target = await findNotificationTemplateTarget(channelCode, targetId);
  if (!target) throw new ResourceNotFoundError("notification template target");
  const versions = await listNotificationTemplateVersions(targetId);
  const published = versions.find((version) => version.status === "PUBLISHED");
  return {
    allowedFields: fieldsForNotificationTarget(fieldTarget(target)),
    channelCode,
    target: targetSummary({
      ...target,
      lastVersionCreatedAt: versions[0]?.createdAt ?? null,
      publishedVersionNumber: published?.versionNumber ?? null,
      versionCount: versions.length,
    }),
    versions: versions.map(versionSummary),
  };
}

export async function importNotificationTemplate(
  user: AuthenticatedUser | null,
  channelCode: string,
  targetId: string,
  input: NotificationHtmlImportInput,
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "IMPORT_TEMPLATE");
  const target = await findNotificationTemplateTarget(channelCode, targetId);
  if (!target) throw new ResourceNotFoundError("notification template target");
  const validated = validateNotificationHtmlImport(
    input,
    fieldsForNotificationTarget(fieldTarget(target)),
  );
  validateRequiredAction(target, validated);
  const auditMetadata = notificationAuditMetadataSchema.parse({
    channelCode,
    correlationId,
    eventKey: target.eventKey ?? undefined,
    templateTargetId: targetId,
  });
  const version = await createNotificationTemplateDraft({
    ...validated,
    actorId: actor.id,
    auditMetadata,
    targetId,
  });
  if (!version) throw new ResourceNotFoundError("notification template target");
  return {
    detectedPlaceholders: validated.detectedPlaceholders,
    version: versionSummary(version),
  };
}

export async function publishNotificationTemplate(
  user: AuthenticatedUser | null,
  channelCode: string,
  targetId: string,
  versionId: string,
  correlationId: string,
) {
  const actor = authorizeNotificationOperation(user, "PUBLISH_TEMPLATE");
  const target = await findNotificationTemplateTarget(channelCode, targetId);
  if (!target) throw new ResourceNotFoundError("notification template target");
  const version = await findNotificationTemplateVersion(targetId, versionId);
  if (!version)
    throw new ResourceNotFoundError("notification template version");
  validateRequiredAction(target, version);
  validateNotificationTemplateContent(
    version,
    fieldsForNotificationTarget(fieldTarget(target)),
  );
  const auditMetadata = notificationAuditMetadataSchema.parse({
    channelCode,
    correlationId,
    eventKey: target.eventKey ?? undefined,
    templateTargetId: targetId,
    templateVersionId: versionId,
  });
  const published = await publishNotificationTemplateVersion({
    actorId: actor.id,
    auditMetadata,
    targetId,
    versionId,
  });
  if (published === undefined) {
    throw new ResourceNotFoundError("notification template version");
  }
  if (published === null) {
    throw new ResourceConflictError(
      "Only draft template versions can be published.",
    );
  }
  return versionSummary(published);
}

export async function resolveNotificationTemplate(
  channelCode: string,
  eventKey: NotificationEventKey,
) {
  return resolvePublishedNotificationTemplate(channelCode, eventKey);
}
