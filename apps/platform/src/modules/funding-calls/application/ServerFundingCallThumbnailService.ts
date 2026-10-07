import "server-only";

import { randomUUID } from "node:crypto";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import { readPublicFundingCallById } from "../infrastructure/PublicFundingCallRepository";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  gcsObjectPathSegments,
  resolveGcsObjectPath,
} from "@/integrations/storage/GcsObjectPath";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { FundingCallView } from "../api/FundingCallTransport";
import {
  readFundingCallById,
} from "../infrastructure/FundingCallRepository";
import { updateFundingCallThumbnailRecord } from "../infrastructure/FundingCallThumbnailRepository";
import { processFundingCallThumbnail } from "../infrastructure/FundingCallThumbnailProcessor";
import {
  deleteFundingCallThumbnailFiles,
  fundingCallThumbnailObjectKey,
} from "../infrastructure/FundingCallThumbnailStorage";
import { toFundingCallView } from "./FundingCallViewMapper";
import {
  validateFundingCallThumbnail,
  validateFundingCallThumbnailSize,
} from "./FundingCallThumbnailValidation";

async function requireCurrentDraft(id: string, expectedRowVersion: number) {
  const call = await readFundingCallById(id);
  if (!call) throw new ResourceNotFoundError("funding call");
  if (call.status !== "DRAFT" || call.rowVersion !== expectedRowVersion) {
    throw new ResourceConflictError(
      call.status === "DRAFT"
        ? "The funding call changed. Refresh it before changing the thumbnail."
        : "Only draft funding calls can change their thumbnail.",
    );
  }
  return call;
}

async function updatedView(id: string): Promise<FundingCallView> {
  const updated = await readFundingCallById(id);
  if (!updated) throw new ResourceNotFoundError("funding call");
  return toFundingCallView(updated);
}

export async function uploadFundingCallThumbnail(
  user: AuthenticatedUser | null,
  id: string,
  expectedRowVersion: number,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(user, permissionCodes.fundingCallEditDraft);
  const current = await requireCurrentDraft(id, expectedRowVersion);
  validateFundingCallThumbnailSize(file.size);
  const body = Buffer.from(await file.arrayBuffer());
  const validated = validateFundingCallThumbnail(file, body);
  const variants = await processFundingCallThumbnail(body);
  const objectKey = resolveGcsObjectPath(
    ...gcsObjectPathSegments.utilities.fundingCalls,
    id,
    `thumbnail-v1-${randomUUID()}`,
    "1024.webp",
  );

  try {
    // Wait for every upload before cleanup so a late write cannot orphan a file.
    const uploads = await Promise.allSettled(variants.map((variant) => storage.put({
      body: variant.body,
      contentType: "image/webp",
      objectKey: fundingCallThumbnailObjectKey(objectKey, variant.width),
    })));
    const failed = uploads.find((upload) => upload.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;

    const saved = await updateFundingCallThumbnailRecord({
      actorId: actor.id,
      expectedRowVersion,
      fundingCallId: id,
      thumbnail: {
        contentType: "image/webp",
        fileName: validated.fileName.replace(/\.[^.]+$/, ".webp"),
        objectKey,
      },
    });
    if (!saved) {
      throw new ResourceConflictError(
        "The funding call changed. Refresh it before changing the thumbnail.",
      );
    }
  } catch (error) {
    await deleteFundingCallThumbnailFiles(storage, objectKey);
    throw error;
  }
  if (current.thumbnailObjectKey && current.thumbnailObjectKey !== objectKey) {
    await deleteFundingCallThumbnailFiles(storage, current.thumbnailObjectKey);
  }
  return updatedView(id);
}

export async function removeFundingCallThumbnail(
  user: AuthenticatedUser | null,
  id: string,
  expectedRowVersion: number,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(user, permissionCodes.fundingCallEditDraft);
  const current = await requireCurrentDraft(id, expectedRowVersion);
  const saved = await updateFundingCallThumbnailRecord({
    actorId: actor.id,
    expectedRowVersion,
    fundingCallId: id,
    thumbnail: null,
  });
  if (!saved) {
    throw new ResourceConflictError(
      "The funding call changed. Refresh it before removing the thumbnail.",
    );
  }
  if (current.thumbnailObjectKey) {
    await deleteFundingCallThumbnailFiles(storage, current.thumbnailObjectKey);
  }
  return updatedView(id);
}

export async function readFundingCallThumbnail(
  user: AuthenticatedUser | null,
  id: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
  width?: number,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  const call = await readFundingCallById(id);
  if (!call?.thumbnailObjectKey || !call.thumbnailContentType) {
    throw new ResourceNotFoundError("funding call thumbnail");
  }
  return {
    body: await storage.read(fundingCallThumbnailObjectKey(call.thumbnailObjectKey, width)),
    contentType: call.thumbnailContentType,
  };
}

export async function readPublicFundingCallThumbnail(
  id: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
  width?: number,
) {
  const call = await readPublicFundingCallById(id);
  if (!call?.thumbnailObjectKey || !call.thumbnailContentType) {
    throw new ResourceNotFoundError("funding call thumbnail");
  }
  return {
    body: await storage.read(fundingCallThumbnailObjectKey(call.thumbnailObjectKey, width)),
    contentType: call.thumbnailContentType,
  };
}
