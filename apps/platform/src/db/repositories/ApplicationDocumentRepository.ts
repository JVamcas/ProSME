import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { applicationDocuments, applications } from "@/db/schema";
import type {
  ApplicationDocumentType,
  ApplicationDocumentView,
} from "@/modules/applications/ApplicationDocumentSchemas";

const viewColumns = {
  contentType: applicationDocuments.contentType,
  documentType: applicationDocuments.documentType,
  fileName: applicationDocuments.originalName,
  id: applicationDocuments.id,
  scanStatus: applicationDocuments.scanStatus,
  sizeBytes: applicationDocuments.sizeBytes,
  uploadedAt: applicationDocuments.uploadedAt,
};

export async function listOwnedApplicationDocuments(
  ownerUserId: string,
  applicationId: string,
): Promise<ApplicationDocumentView[]> {
  const rows = await getDatabase()
    .select(viewColumns)
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.ownerUserId, ownerUserId),
        eq(applicationDocuments.applicationId, applicationId),
      ),
    )
    .orderBy(applicationDocuments.uploadedAt);
  return rows.map((row) => ({
    ...row,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
}

export async function hasRequiredApplicationDocuments(
  ownerUserId: string,
  applicationId: string,
  requiredTypes: ApplicationDocumentType[],
) {
  const rows = await getDatabase()
    .select({ documentType: applicationDocuments.documentType })
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.ownerUserId, ownerUserId),
        eq(applicationDocuments.applicationId, applicationId),
        inArray(applicationDocuments.documentType, requiredTypes),
        ne(applicationDocuments.scanStatus, "rejected"),
      ),
    );
  return new Set(rows.map((row) => row.documentType)).size === requiredTypes.length;
}

export async function replaceOwnedApplicationDocument(input: {
  applicationId: string;
  contentType: string;
  documentType: ApplicationDocumentType;
  objectKey: string;
  originalName: string;
  ownerUserId: string;
  sizeBytes: number;
}): Promise<string | null | undefined> {
  return getDatabase().transaction(async (transaction) => {
    const [ownedApplication] = await transaction
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, input.applicationId),
          eq(applications.ownerUserId, input.ownerUserId),
          eq(applications.status, "draft"),
        ),
      )
      .limit(1);
    if (!ownedApplication) return undefined;
    const [previous] = await transaction
      .select({ objectKey: applicationDocuments.objectKey })
      .from(applicationDocuments)
      .where(
        and(
          eq(applicationDocuments.applicationId, input.applicationId),
          eq(applicationDocuments.ownerUserId, input.ownerUserId),
          eq(applicationDocuments.documentType, input.documentType),
        ),
      )
      .limit(1);
    await transaction
      .insert(applicationDocuments)
      .values(input)
      .onConflictDoUpdate({
        set: {
          contentType: input.contentType,
          objectKey: input.objectKey,
          originalName: input.originalName,
          scanStatus: "pending",
          sizeBytes: input.sizeBytes,
          uploadedAt: new Date(),
        },
        target: [
          applicationDocuments.applicationId,
          applicationDocuments.documentType,
        ],
      });
    return previous?.objectKey ?? null;
  });
}
