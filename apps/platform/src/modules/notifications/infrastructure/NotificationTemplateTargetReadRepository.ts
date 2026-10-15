import "server-only";

import { and, asc, count, eq, max, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "@/platform/database/client";
import {
  notificationCatalogs,
  notificationChannels,
  notificationEvents,
  notificationTemplateTargets,
  notificationTemplateVersions,
} from "./notification.schema";

const eventCatalogs = alias(notificationCatalogs, "event_catalogs");

export async function listNotificationTemplateTargets(
  channelCode: string,
  search?: string,
) {
  const term = search?.trim();
  const pattern = term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  const matchesCatalog = pattern
    ? or(
        eq(notificationTemplateTargets.scope, "GLOBAL"),
        sql`coalesce(${notificationCatalogs.catalogKey}, ${eventCatalogs.catalogKey}) ILIKE ${pattern}`,
        sql`coalesce(${notificationCatalogs.displayName}, ${eventCatalogs.displayName}) ILIKE ${pattern}`,
        sql`coalesce(${notificationCatalogs.description}, ${eventCatalogs.description}) ILIKE ${pattern}`,
      )
    : undefined;
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
      defaultSubjectTemplate:
        notificationTemplateTargets.defaultSubjectTemplate,
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
    .leftJoin(eventCatalogs, eq(eventCatalogs.id, notificationEvents.catalogId))
    .leftJoin(
      notificationTemplateVersions,
      eq(
        notificationTemplateVersions.templateTargetId,
        notificationTemplateTargets.id,
      ),
    )
    .where(and(eq(notificationChannels.code, channelCode), matchesCatalog))
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
      asc(
        sql`coalesce(${notificationCatalogs.catalogKey}, ${eventCatalogs.catalogKey})`,
      ),
      asc(notificationEvents.eventKey),
    );
}
