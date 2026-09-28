import "server-only";

import { and, asc, count, desc, eq, max, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import type { NotificationAuditMetadata } from "../domain/NotificationAudit";
import type { NotificationTemplateScope } from "../domain/NotificationTemplate";
import {
  notificationCatalogs,
  notificationChannels,
  notificationEvents,
  notificationTemplateTargets,
  notificationTemplateVersions,
} from "./notification.schema";

export type NotificationTemplateTargetRecord = {
  catalogKey: string | null;
  catalogName: string | null;
  channelCode: string;
  defaultSubjectTemplate: string;
  description: string | null;
  displayName: string | null;
  eventKey: string | null;
  id: string;
  isEnabled: boolean;
  scope: NotificationTemplateScope;
  targetUpdatedAt: Date;
};

export type NotificationTemplateDraftRecord = {
  contentSha256: string;
  createdAt: Date;
  htmlTemplate: string;
  id: string;
  mediaType: string;
  plainTextTemplate: string;
  publishedAt: Date | null;
  sourceFileName: string;
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  subjectTemplate: string;
  versionNumber: number;
};

export type CreateNotificationTemplateDraftInput = {
  actorId: string;
  auditMetadata: NotificationAuditMetadata;
  contentSha256: string;
  htmlTemplate: string;
  mediaType: "text/html";
  plainTextTemplate: string;
  sourceFileName: string;
  subjectTemplate: string;
  targetId: string;
};

const versionProjection = {
  contentSha256: notificationTemplateVersions.contentSha256,
  createdAt: notificationTemplateVersions.createdAt,
  htmlTemplate: notificationTemplateVersions.htmlTemplate,
  id: notificationTemplateVersions.id,
  mediaType: notificationTemplateVersions.mediaType,
  plainTextTemplate: notificationTemplateVersions.plainTextTemplate,
  publishedAt: notificationTemplateVersions.publishedAt,
  sourceFileName: notificationTemplateVersions.sourceFileName,
  status: notificationTemplateVersions.status,
  subjectTemplate: notificationTemplateVersions.subjectTemplate,
  versionNumber: notificationTemplateVersions.versionNumber,
};

const eventCatalogs = alias(notificationCatalogs, "event_catalogs");

export async function listNotificationChannels() {
  return getDatabase()
    .select({
      channelType: notificationChannels.channelType,
      code: notificationChannels.code,
      displayName: notificationChannels.displayName,
      isEnabled: notificationChannels.isEnabled,
      sortOrder: notificationChannels.sortOrder,
      targetCount: count(notificationTemplateTargets.id).mapWith(Number),
      updatedAt: sql<string>`to_char(
        ${notificationChannels.updatedAt} AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US'
      ) || 'Z'`,
    })
    .from(notificationChannels)
    .leftJoin(
      notificationTemplateTargets,
      eq(notificationTemplateTargets.channelId, notificationChannels.id),
    )
    .groupBy(notificationChannels.id)
    .orderBy(asc(notificationChannels.sortOrder), asc(notificationChannels.code));
}

export async function findNotificationChannel(code: string) {
  const [channel] = await getDatabase()
    .select({
      channelType: notificationChannels.channelType,
      code: notificationChannels.code,
      displayName: notificationChannels.displayName,
      isEnabled: notificationChannels.isEnabled,
      sortOrder: notificationChannels.sortOrder,
      targetCount: sql<number>`(
        select count(*)::int from app_notification_template_targets target_count
        where target_count.channel_id = ${notificationChannels.id}
      )`,
      updatedAt: sql<string>`to_char(
        ${notificationChannels.updatedAt} AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US'
      ) || 'Z'`,
    })
    .from(notificationChannels)
    .where(eq(notificationChannels.code, code))
    .limit(1);
  return channel;
}

export async function listNotificationTemplateTargets(channelCode: string) {
  return getDatabase()
    .select({
      catalogKey: sql<string | null>`coalesce(
        ${notificationCatalogs.catalogKey},
        ${eventCatalogs.catalogKey}
      )`,
      catalogName: sql<string | null>`coalesce(
        ${notificationCatalogs.displayName},
        ${eventCatalogs.displayName}
      )`,
      description: sql<string | null>`coalesce(
        ${notificationEvents.description},
        ${notificationCatalogs.description}
      )`,
      defaultSubjectTemplate: notificationTemplateTargets.defaultSubjectTemplate,
      displayName: notificationEvents.displayName,
      eventKey: notificationEvents.eventKey,
      id: notificationTemplateTargets.id,
      isEnabled: notificationTemplateTargets.isEnabled,
      lastVersionCreatedAt: max(notificationTemplateVersions.createdAt),
      publishedVersionNumber: sql<number | null>`max(case
        when ${notificationTemplateVersions.status} = 'PUBLISHED'
        then ${notificationTemplateVersions.versionNumber} end)`,
      scope: notificationTemplateTargets.scope,
      targetUpdatedAt: notificationTemplateTargets.updatedAt,
      versionCount: count(notificationTemplateVersions.id).mapWith(Number),
    })
    .from(notificationTemplateTargets)
    .innerJoin(
      notificationChannels,
      eq(notificationChannels.id, notificationTemplateTargets.channelId),
    )
    .leftJoin(
      notificationCatalogs,
      eq(notificationCatalogs.id, notificationTemplateTargets.catalogId),
    )
    .leftJoin(
      notificationEvents,
      eq(notificationEvents.id, notificationTemplateTargets.eventId),
    )
    .leftJoin(
      eventCatalogs,
      eq(eventCatalogs.id, notificationEvents.catalogId),
    )
    .leftJoin(
      notificationTemplateVersions,
      eq(notificationTemplateVersions.templateTargetId, notificationTemplateTargets.id),
    )
    .where(eq(notificationChannels.code, channelCode))
    .groupBy(
      notificationTemplateTargets.id,
      notificationCatalogs.catalogKey,
      notificationCatalogs.displayName,
      notificationCatalogs.description,
      eventCatalogs.catalogKey,
      eventCatalogs.displayName,
      notificationEvents.eventKey,
      notificationEvents.displayName,
      notificationEvents.description,
    )
    .orderBy(
      sql`case ${notificationTemplateTargets.scope}
        when 'GLOBAL' then 1 when 'CATALOG' then 2 else 3 end`,
      asc(sql`coalesce(${notificationCatalogs.catalogKey}, ${eventCatalogs.catalogKey})`),
      asc(notificationEvents.eventKey),
    );
}

export async function findNotificationTemplateTarget(
  channelCode: string,
  targetId: string,
): Promise<NotificationTemplateTargetRecord | undefined> {
  const [target] = await getDatabase()
    .select({
      catalogKey: sql<string | null>`coalesce(
        ${notificationCatalogs.catalogKey},
        ${eventCatalogs.catalogKey}
      )`,
      catalogName: sql<string | null>`coalesce(
        ${notificationCatalogs.displayName},
        ${eventCatalogs.displayName}
      )`,
      channelCode: notificationChannels.code,
      description: sql<string | null>`coalesce(
        ${notificationEvents.description},
        ${notificationCatalogs.description}
      )`,
      defaultSubjectTemplate: notificationTemplateTargets.defaultSubjectTemplate,
      displayName: notificationEvents.displayName,
      eventKey: notificationEvents.eventKey,
      id: notificationTemplateTargets.id,
      isEnabled: notificationTemplateTargets.isEnabled,
      scope: notificationTemplateTargets.scope,
      targetUpdatedAt: notificationTemplateTargets.updatedAt,
    })
    .from(notificationTemplateTargets)
    .innerJoin(
      notificationChannels,
      eq(notificationChannels.id, notificationTemplateTargets.channelId),
    )
    .leftJoin(
      notificationCatalogs,
      eq(notificationCatalogs.id, notificationTemplateTargets.catalogId),
    )
    .leftJoin(
      notificationEvents,
      eq(notificationEvents.id, notificationTemplateTargets.eventId),
    )
    .leftJoin(
      eventCatalogs,
      eq(eventCatalogs.id, notificationEvents.catalogId),
    )
    .where(and(
      eq(notificationChannels.code, channelCode),
      eq(notificationTemplateTargets.id, targetId),
    ))
    .limit(1);
  return target;
}

export async function listNotificationTemplateVersions(targetId: string) {
  return getDatabase()
    .select(versionProjection)
    .from(notificationTemplateVersions)
    .where(eq(notificationTemplateVersions.templateTargetId, targetId))
    .orderBy(desc(notificationTemplateVersions.versionNumber));
}

export async function createNotificationTemplateDraft(
  input: CreateNotificationTemplateDraftInput,
) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.targetId}, 0))`,
    );
    const [target] = await transaction
      .select({ id: notificationTemplateTargets.id })
      .from(notificationTemplateTargets)
      .where(eq(notificationTemplateTargets.id, input.targetId))
      .limit(1);
    if (!target) return undefined;
    const [latest] = await transaction
      .select({ versionNumber: max(notificationTemplateVersions.versionNumber) })
      .from(notificationTemplateVersions)
      .where(eq(notificationTemplateVersions.templateTargetId, input.targetId));
    const [version] = await transaction
      .insert(notificationTemplateVersions)
      .values({
        contentSha256: input.contentSha256,
        htmlTemplate: input.htmlTemplate,
        mediaType: input.mediaType,
        plainTextTemplate: input.plainTextTemplate,
        sourceFileName: input.sourceFileName,
        subjectTemplate: input.subjectTemplate,
        templateTargetId: input.targetId,
        uploadedByUserId: input.actorId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
      })
      .returning(versionProjection);
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_TEMPLATE_IMPORTED",
      actorId: input.actorId,
      changes: input.auditMetadata,
    });
    return version;
  });
}

export async function findNotificationTemplateVersion(
  targetId: string,
  versionId: string,
) {
  const [version] = await getDatabase()
    .select(versionProjection)
    .from(notificationTemplateVersions)
    .where(and(
      eq(notificationTemplateVersions.id, versionId),
      eq(notificationTemplateVersions.templateTargetId, targetId),
    ))
    .limit(1);
  return version;
}

export async function publishNotificationTemplateVersion(input: {
  actorId: string;
  auditMetadata: NotificationAuditMetadata;
  targetId: string;
  versionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.targetId}, 0))`,
    );
    const [version] = await transaction
      .select({ status: notificationTemplateVersions.status })
      .from(notificationTemplateVersions)
      .where(and(
        eq(notificationTemplateVersions.id, input.versionId),
        eq(notificationTemplateVersions.templateTargetId, input.targetId),
      ))
      .limit(1);
    if (!version) return undefined;
    if (version.status !== "DRAFT") return null;
    await transaction
      .update(notificationTemplateVersions)
      .set({ status: "RETIRED" })
      .where(and(
        eq(notificationTemplateVersions.templateTargetId, input.targetId),
        eq(notificationTemplateVersions.status, "PUBLISHED"),
      ));
    const [published] = await transaction
      .update(notificationTemplateVersions)
      .set({
        publishedAt: new Date(),
        publishedByUserId: input.actorId,
        status: "PUBLISHED",
      })
      .where(eq(notificationTemplateVersions.id, input.versionId))
      .returning(versionProjection);
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_TEMPLATE_PUBLISHED",
      actorId: input.actorId,
      changes: input.auditMetadata,
    });
    return published;
  });
}

export async function resolvePublishedNotificationTemplate(
  channelCode: string,
  eventKey: string,
) {
  const [resolved] = await getDatabase()
    .select({
      ...versionProjection,
      targetId: notificationTemplateTargets.id,
      targetScope: notificationTemplateTargets.scope,
    })
    .from(notificationEvents)
    .innerJoin(notificationChannels, eq(notificationChannels.code, channelCode))
    .innerJoin(
      notificationTemplateTargets,
      and(
        eq(notificationTemplateTargets.channelId, notificationChannels.id),
        eq(notificationTemplateTargets.isEnabled, true),
        or(
          and(
            eq(notificationTemplateTargets.scope, "EVENT"),
            eq(notificationTemplateTargets.eventId, notificationEvents.id),
          ),
          and(
            eq(notificationTemplateTargets.scope, "CATALOG"),
            eq(notificationTemplateTargets.catalogId, notificationEvents.catalogId),
          ),
          eq(notificationTemplateTargets.scope, "GLOBAL"),
        ),
      ),
    )
    .innerJoin(
      notificationTemplateVersions,
      and(
        eq(notificationTemplateVersions.templateTargetId, notificationTemplateTargets.id),
        eq(notificationTemplateVersions.status, "PUBLISHED"),
      ),
    )
    .where(and(
      eq(notificationEvents.eventKey, eventKey),
      eq(notificationChannels.isEnabled, true),
    ))
    .orderBy(sql`case ${notificationTemplateTargets.scope}
      when 'EVENT' then 1 when 'CATALOG' then 2 else 3 end`)
    .limit(1);
  return resolved;
}
