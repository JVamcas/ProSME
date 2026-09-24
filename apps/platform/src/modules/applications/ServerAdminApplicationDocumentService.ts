import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getAdminApplicationOverview } from "./ServerAdminApplicationService";
import { findDownloadableApplicationDocumentVersion } from "./infrastructure/ApplicationDocumentRepository";

export async function createAdminApplicationDocumentDownload(
  user: AuthenticatedUser | null,
  applicationId: string,
  versionId: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const overview = await getAdminApplicationOverview(user, applicationId);
  if (!overview) throw new ResourceNotFoundError("application document");

  const version = await findDownloadableApplicationDocumentVersion(
    applicationId,
    versionId,
  );
  if (!version) throw new ResourceNotFoundError("application document");

  return storage.createSignedDownloadUrl({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    fileName: version.originalName,
    objectKey: version.objectKey,
  });
}
