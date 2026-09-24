import "server-only";

import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ApplicationDocumentView } from "../api/ApplicationDocumentSchemas";
import { applications } from "./application.schema";
import {
  applicationDocumentVersions,
  type ApplicationDocumentVersionRecord,
} from "./application-document.schema";

const latestVersionRank = sql<number>`row_number() over (
  partition by ${applicationDocumentVersions.requirementKey}
  order by ${applicationDocumentVersions.versionNumber} desc
)`;

function toView(row: {
  contentType: string;
  originalName: string;
  requirementKey: string;
  sizeBytes: number;
  storageStatus: ApplicationDocumentVersionRecord["storageStatus"];
  uploadedAt: Date;
  versionId: string;
  versionNumber: number;
}): ApplicationDocumentView {
  return {
    contentType: row.contentType,
    fileName: row.originalName,
    requirementKey: row.requirementKey,
    sizeBytes: row.sizeBytes,
    storageStatus: row.storageStatus,
    uploadedAt: row.uploadedAt.toISOString(),
    versionId: row.versionId,
    versionNumber: row.versionNumber,
  };
}

export async function listLatestOwnedApplicationDocumentVersions(
  ownerUserId: string,
  applicationId: string,
): Promise<ApplicationDocumentView[]> {
  const ranked = getDatabase().$with("ranked_document_versions").as(
    getDatabase()
      .select({
        contentType: applicationDocumentVersions.contentType,
        originalName: applicationDocumentVersions.originalName,
        rank: latestVersionRank.as("version_rank"),
        requirementKey: applicationDocumentVersions.requirementKey,
        sizeBytes: applicationDocumentVersions.sizeBytes,
        storageStatus: applicationDocumentVersions.storageStatus,
        uploadedAt: applicationDocumentVersions.uploadedAt,
        versionId: applicationDocumentVersions.id,
        versionNumber: applicationDocumentVersions.versionNumber,
      })
      .from(applicationDocumentVersions)
      .where(and(
        eq(applicationDocumentVersions.ownerUserId, ownerUserId),
        eq(applicationDocumentVersions.applicationId, applicationId),
      )),
  );
  const rows = await getDatabase()
    .with(ranked)
    .select()
    .from(ranked)
    .where(eq(ranked.rank, 1))
    .orderBy(asc(ranked.requirementKey));
  return rows.map(toView);
}

export async function createPendingApplicationDocumentVersion(input: {
  applicationId: string;
  checksumSha256: string;
  contentType: string;
  extension: string;
  objectKey: string;
  originalName: string;
  ownerUserId: string;
  requirementKey: string;
  sizeBytes: number;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [application] = await transaction
      .select({ id: applications.id })
      .from(applications)
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.ownerUserId),
        eq(applications.status, "draft"),
        isNull(applications.deletedAt),
      ))
      .for("update")
      .limit(1);
    if (!application) return null;
    const [latest] = await transaction
      .select({ versionNumber: applicationDocumentVersions.versionNumber })
      .from(applicationDocumentVersions)
      .where(and(
        eq(applicationDocumentVersions.applicationId, input.applicationId),
        eq(applicationDocumentVersions.requirementKey, input.requirementKey),
      ))
      .orderBy(desc(applicationDocumentVersions.versionNumber))
      .limit(1);
    const [created] = await transaction
      .insert(applicationDocumentVersions)
      .values({
        ...input,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
      })
      .returning({
        id: applicationDocumentVersions.id,
        versionNumber: applicationDocumentVersions.versionNumber,
      });
    return created;
  });
}

export async function finalizeApplicationDocumentVersion(versionId: string) {
  const [version] = await getDatabase()
    .update(applicationDocumentVersions)
    .set({ finalizedAt: new Date(), storageStatus: "finalized" })
    .where(and(
      eq(applicationDocumentVersions.id, versionId),
      eq(applicationDocumentVersions.storageStatus, "pending"),
    ))
    .returning({ id: applicationDocumentVersions.id });
  return Boolean(version);
}

export async function failApplicationDocumentVersion(
  versionId: string,
  failureCode: string,
) {
  await getDatabase()
    .update(applicationDocumentVersions)
    .set({ failureCode, storageStatus: "failed" })
    .where(and(
      eq(applicationDocumentVersions.id, versionId),
      eq(applicationDocumentVersions.storageStatus, "pending"),
    ));
}

export async function findOwnedDownloadableApplicationDocumentVersion(
  ownerUserId: string,
  applicationId: string,
  versionId: string,
) {
  const [version] = await getDatabase()
    .select({
      objectKey: applicationDocumentVersions.objectKey,
      originalName: applicationDocumentVersions.originalName,
    })
    .from(applicationDocumentVersions)
    .innerJoin(
      applications,
      eq(applications.id, applicationDocumentVersions.applicationId),
    )
    .where(and(
      eq(applicationDocumentVersions.id, versionId),
      eq(applicationDocumentVersions.applicationId, applicationId),
      eq(applicationDocumentVersions.ownerUserId, ownerUserId),
      eq(applications.ownerUserId, ownerUserId),
      isNull(applications.deletedAt),
      eq(applicationDocumentVersions.storageStatus, "finalized"),
    ))
    .limit(1);
  return version ?? null;
}

export async function listAbandonedApplicationDocumentObjects(before: Date) {
  return getDatabase()
    .select({
      objectKey: applicationDocumentVersions.objectKey,
      versionId: applicationDocumentVersions.id,
    })
    .from(applicationDocumentVersions)
    .where(and(
      inArray(applicationDocumentVersions.storageStatus, ["pending", "failed"]),
      lt(applicationDocumentVersions.uploadedAt, before),
    ))
    .orderBy(applicationDocumentVersions.uploadedAt)
    .limit(100);
}

export async function markApplicationDocumentVersionAbandoned(
  versionId: string,
) {
  await getDatabase()
    .update(applicationDocumentVersions)
    .set({ storageStatus: "abandoned" })
    .where(and(
      eq(applicationDocumentVersions.id, versionId),
      inArray(applicationDocumentVersions.storageStatus, ["pending", "failed"]),
    ));
}

export async function findDownloadableApplicationDocumentVersion(
  applicationId: string,
  versionId: string,
) {
  const [version] = await getDatabase()
    .select({
      objectKey: applicationDocumentVersions.objectKey,
      originalName: applicationDocumentVersions.originalName,
    })
    .from(applicationDocumentVersions)
    .where(and(
      eq(applicationDocumentVersions.applicationId, applicationId),
      eq(applicationDocumentVersions.id, versionId),
      eq(applicationDocumentVersions.storageStatus, "finalized"),
    ))
    .limit(1);
  return version ?? null;
}
