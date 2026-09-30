import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { gcsObjectPrefixes } from "@/integrations/storage/GcsObjectPrefixes";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { getServerEnvironment } from "@/lib/env/server";
import type { BrandingSettingsView } from "../api/BrandingSchemas";
import {
  findBrandingSettingsRecord,
  upsertBrandingSettingsRecord,
} from "../infrastructure/BrandingSettingsRepository";
import { validateBrandingLogo } from "./BrandingLogoValidation";

const defaultLogoPath = path.join(
  process.cwd(),
  "public/brand/ProSME-logo-with-tagline.svg",
);

function logoUrl(updatedAt?: Date | null) {
  const version = updatedAt ? `?v=${updatedAt.getTime()}` : "";
  return `/api/branding/logo${version}`;
}

function toView(
  settings: Awaited<ReturnType<typeof findBrandingSettingsRecord>>,
): BrandingSettingsView {
  return {
    hasLogo: Boolean(settings),
    logoContentType: settings?.logoContentType ?? null,
    logoFileName: settings?.logoFileName ?? null,
    logoUrl: logoUrl(settings?.updatedAt),
    storagePrefix: [
      getServerEnvironment().GCS_ROOT_PREFIX,
      gcsObjectPrefixes.utilities,
      "brand",
    ].join("/"),
    updatedAt: settings?.updatedAt.toISOString() ?? null,
  };
}

export async function getBrandingSettings(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.brandingRead);
  return toView(await findBrandingSettingsRecord());
}

export async function updateBrandingLogo(
  user: AuthenticatedUser | null,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(user, permissionCodes.brandingManage);
  const body = Buffer.from(await file.arrayBuffer());
  const validated = validateBrandingLogo(file, body);
  const objectKey = [
    getServerEnvironment().GCS_ROOT_PREFIX,
    gcsObjectPrefixes.utilities,
    "brand",
    `${randomUUID()}${validated.extension}`,
  ].join("/");
  const previous = await findBrandingSettingsRecord();

  await storage.put({ body, contentType: validated.contentType, objectKey });
  try {
    const settings = await upsertBrandingSettingsRecord({
      actorId: actor.id,
      contentType: validated.contentType,
      fileName: validated.fileName,
      objectKey,
    });
    if (previous?.logoObjectKey && previous.logoObjectKey !== objectKey) {
      await storage.delete(previous.logoObjectKey).catch(() => undefined);
    }
    return toView(settings);
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
}

export async function readBrandingLogo(
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const settings = await findBrandingSettingsRecord();
  if (settings) {
    return {
      body: await storage.read(settings.logoObjectKey),
      contentType: settings.logoContentType,
      updatedAt: settings.updatedAt,
    };
  }
  return {
    body: await readFile(defaultLogoPath),
    contentType: "image/svg+xml",
    updatedAt: null,
  };
}

export function getBrandingLogoUrl() {
  return new URL(
    "/api/branding/logo",
    `${getServerEnvironment().APP_PUBLIC_URL.replace(/\/$/, "")}/`,
  ).toString();
}
