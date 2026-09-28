import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import type {
  NotificationChannelDetail,
  NotificationTemplateTargetDetail,
  NotificationTemplateTargetSummary,
  NotificationTemplateVersionSummary,
} from "../api/NotificationTemplateSchemas";
import { notificationAuditMetadataSchema } from "../domain/NotificationAudit";
import {
  isNotificationEventKey,
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
import { authorizeNotificationOperation } from "./NotificationAuthorization";
import {
  validateNotificationHtmlImport,
  validateNotificationTemplateContent,
  type NotificationHtmlImportInput,
} from "./NotificationHtmlImport";

function isoDate(value: Date | null): string | null {
  return value?.toISOString() ?? null;
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
  const catalogKey = notificationCatalogKeys.includes(target.catalogKey as NotificationCatalogKey)
    ? target.catalogKey as NotificationCatalogKey
    : null;
  const eventKey = target.eventKey && isNotificationEventKey(target.eventKey)
    ? target.eventKey
    : null;
  return { catalogKey, eventKey, scope: target.scope };
}

function targetLabel(target: {
  catalogKey: string | null;
  eventKey: string | null;
  scope: "GLOBAL" | "CATALOG" | "EVENT";
}): string {
  if (target.scope === "EVENT") return target.eventKey ?? "Event";
  if (target.scope === "CATALOG") return target.catalogKey ?? "Catalog";
  return "Global fallback";
}

function targetSummary(target: {
  catalogKey: string | null;
  eventKey: string | null;
  id: string;
  isEnabled: boolean;
  publishedVersionNumber: number | null;
  scope: "GLOBAL" | "CATALOG" | "EVENT";
  versionCount: number;
}): NotificationTemplateTargetSummary {
  return {
    ...target,
    allowedFields: fieldsForNotificationTarget(fieldTarget(target)),
    label: targetLabel(target),
  };
}

export async function getNotificationChannels(user: AuthenticatedUser | null) {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  return listNotificationChannels();
}

export async function getNotificationChannel(
  user: AuthenticatedUser | null,
  channelCode: string,
): Promise<NotificationChannelDetail> {
  authorizeNotificationOperation(user, "READ_CONFIGURATION");
  const channel = await findNotificationChannel(channelCode);
  if (!channel) throw new ResourceNotFoundError("notification channel");
  const targets = await listNotificationTemplateTargets(channelCode);
  return { channel, targets: targets.map(targetSummary) };
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
  if (!version) throw new ResourceNotFoundError("notification template version");
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
    throw new ResourceConflictError("Only draft template versions can be published.");
  }
  return versionSummary(published);
}

export async function resolveNotificationTemplate(
  channelCode: string,
  eventKey: NotificationEventKey,
) {
  return resolvePublishedNotificationTemplate(channelCode, eventKey);
}
