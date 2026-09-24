import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({
  getAdminApplicationOverview: vi.fn(),
}));
vi.mock("@/modules/applications/infrastructure/ApplicationDocumentRepository", () => ({
  findDownloadableApplicationDocumentVersion: vi.fn(),
}));

import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getAdminApplicationOverview } from "@/modules/applications/ServerAdminApplicationService";
import { createAdminApplicationDocumentDownload } from "@/modules/applications/ServerAdminApplicationDocumentService";
import { findDownloadableApplicationDocumentVersion } from "@/modules/applications/infrastructure/ApplicationDocumentRepository";

const user = { id: "staff-user" } as never;
const createSignedDownloadUrl = vi.fn().mockResolvedValue("https://example.test/file");
const storage = { createSignedDownloadUrl } as unknown as DocumentStorage;
const applicationId = "10000000-0000-4000-8000-000000000001";
const versionId = "30000000-0000-4000-8000-000000000003";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin application document download", () => {
  it("denies document lookup when application scope is not authorized", async () => {
    vi.mocked(getAdminApplicationOverview).mockResolvedValue(null);

    await expect(createAdminApplicationDocumentDownload(
      user,
      applicationId,
      versionId,
      storage,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findDownloadableApplicationDocumentVersion).not.toHaveBeenCalled();
  });

  it("signs only a finalized document linked to the authorized application", async () => {
    vi.mocked(getAdminApplicationOverview).mockResolvedValue({} as never);
    vi.mocked(findDownloadableApplicationDocumentVersion).mockResolvedValue({
      objectKey: "applications/file.pdf",
      originalName: "file.pdf",
    });

    await expect(createAdminApplicationDocumentDownload(
      user,
      applicationId,
      versionId,
      storage,
    )).resolves.toBe("https://example.test/file");
    expect(findDownloadableApplicationDocumentVersion).toHaveBeenCalledWith(
      applicationId,
      versionId,
    );
    expect(createSignedDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "file.pdf",
        objectKey: "applications/file.pdf",
      }),
    );
  });
});
