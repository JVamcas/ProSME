import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import {
  brandingSettings,
  type BrandingSettingsRecord,
} from "./branding.schema";

const brandingSettingsKey = "default";

export async function findBrandingSettingsRecord() {
  const [settings] = await getDatabase()
    .select()
    .from(brandingSettings)
    .where(eq(brandingSettings.key, brandingSettingsKey))
    .limit(1);
  return settings ?? null;
}

export async function upsertBrandingSettingsRecord(input: {
  actorId: string;
  contentType: string;
  fileName: string;
  objectKey: string;
}): Promise<BrandingSettingsRecord> {
  return getDatabase().transaction(async (transaction) => {
    const [settings] = await transaction
      .insert(brandingSettings)
      .values({
        key: brandingSettingsKey,
        logoContentType: input.contentType,
        logoFileName: input.fileName,
        logoObjectKey: input.objectKey,
        updatedBy: input.actorId,
      })
      .onConflictDoUpdate({
        target: brandingSettings.key,
        set: {
          logoContentType: input.contentType,
          logoFileName: input.fileName,
          logoObjectKey: input.objectKey,
          updatedAt: new Date(),
          updatedBy: input.actorId,
        },
      })
      .returning();

    await transaction.insert(authorizationAuditEntries).values({
      action: "branding.logo.update",
      actorId: input.actorId,
      changes: {
        contentType: input.contentType,
        fileName: input.fileName,
        objectKey: input.objectKey,
      },
    });

    return settings;
  });
}
