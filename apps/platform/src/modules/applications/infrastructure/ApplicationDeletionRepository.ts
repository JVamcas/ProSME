import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { applicationAuditEntries, applications } from "./application.schema";

export async function deleteOwnedApplicationDraft(input: {
  actorId: string;
  applicationId: string;
  correlationId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [application] = await transaction
      .select({
        deletedAt: applications.deletedAt,
        id: applications.id,
        rowVersion: applications.rowVersion,
        status: applications.status,
      })
      .from(applications)
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.actorId),
      ))
      .for("update")
      .limit(1);
    if (!application || application.deletedAt) return "not_found" as const;
    if (application.status !== "draft") return "not_draft" as const;

    const deletedAt = new Date();
    await transaction
      .update(applications)
      .set({
        deletedAt,
        rowVersion: application.rowVersion + 1,
        updatedAt: deletedAt,
      })
      .where(eq(applications.id, application.id));
    await transaction.insert(applicationAuditEntries).values({
      action: "APPLICATION_DRAFT_DELETED",
      actorUserId: input.actorId,
      applicationId: application.id,
      correlationId: input.correlationId,
      metadata: { deletedAt: deletedAt.toISOString() },
    });
    return "deleted" as const;
  });
}
