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
const read = vi.fn().mockResolvedValue(Buffer.from("document"));
const storage = { read } as unknown as DocumentStorage;
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

  it("reads only a finalized document linked to the authorized application", async () => {
    vi.mocked(getAdminApplicationOverview).mockResolvedValue({} as never);
    vi.mocked(findDownloadableApplicationDocumentVersion).mockResolvedValue({
      contentType: "application/pdf",
      objectKey: "applications/file.pdf",
      originalName: "file.pdf",
    });

    await expect(createAdminApplicationDocumentDownload(
      user,
      applicationId,
      versionId,
      storage,
    )).resolves.toEqual({
      body: Buffer.from("document"),
      contentType: "application/pdf",
      fileName: "file.pdf",
    });
    expect(findDownloadableApplicationDocumentVersion).toHaveBeenCalledWith(
      applicationId,
      versionId,
    );
    expect(read).toHaveBeenCalledWith("applications/file.pdf");
  });
});
