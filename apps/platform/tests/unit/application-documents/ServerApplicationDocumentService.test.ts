import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationDocumentRepository", () => ({
  createPendingApplicationDocumentVersion: vi.fn(),
  failApplicationDocumentVersion: vi.fn(),
  finalizeApplicationDocumentVersion: vi.fn(),
  findOwnedDownloadableApplicationDocumentVersion: vi.fn(),
  listAbandonedApplicationDocumentObjects: vi.fn(),
  listLatestOwnedApplicationDocumentVersions: vi.fn(),
  markApplicationDocumentVersionAbandoned: vi.fn(),
}));
vi.mock("@/modules/applications/infrastructure/ApplicationRepository", () => ({
  findOwnedApplication: vi.fn(),
}));
vi.mock("@/modules/applications/infrastructure/ApplicationResponseRepository", () => ({
  readOwnedApplicationDraftResponse: vi.fn(),
}));
vi.mock("@/modules/applications/infrastructure/AttachedApplicationFormRepository", () => ({
  getAttachedApplicationForm: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  InvalidApplicationDocumentError,
  createOwnApplicationDocumentDownload,
  getOwnApplicationDocuments,
  uploadOwnApplicationDocument,
} from "@/modules/applications/application/ServerApplicationDocumentService";
import {
  createPendingApplicationDocumentVersion,
  failApplicationDocumentVersion,
  finalizeApplicationDocumentVersion,
  findOwnedDownloadableApplicationDocumentVersion,
  listLatestOwnedApplicationDocumentVersions,
} from "@/modules/applications/infrastructure/ApplicationDocumentRepository";
import { findOwnedApplication } from "@/modules/applications/infrastructure/ApplicationRepository";
import { readOwnedApplicationDraftResponse } from "@/modules/applications/infrastructure/ApplicationResponseRepository";
import { getAttachedApplicationForm } from "@/modules/applications/infrastructure/AttachedApplicationFormRepository";

const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
const fundingOpportunityId = "79e20de0-3558-4d63-90a4-8c9f5125df08";
const formVersionId = "89e20de0-3558-4d63-90a4-8c9f5125df07";
const versionId = "69e20de0-3558-4d63-90a4-8c9f5125df07";
const actor = {
  capabilities: new Set([
    permissionCodes.fundingApplicationDocumentOwnRead,
    permissionCodes.fundingApplicationDocumentOwnUpload,
  ]),
  createdAt: new Date(),
  displayName: "Applicant",
  email: "applicant@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "firebase-subject",
  lastLoginAt: null,
  roleCodes: new Set(["applicant"]),
  status: "active",
  updatedAt: new Date(),
  userType: "applicant",
} satisfies AuthenticatedUser;

function pdf(name = "registration.pdf") {
  return new File([Buffer.from("%PDF-1.7\nexample")], name, {
    type: "application/pdf",
  });
}

function storage(): DocumentStorage {
  return {
    createSignedDownloadUrl: vi.fn().mockResolvedValue("https://signed.test"),
    delete: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findOwnedApplication).mockResolvedValue({
    formVersionId,
    fundingOpportunityId,
    status: "draft",
  } as never);
  vi.mocked(readOwnedApplicationDraftResponse).mockResolvedValue({
    formVersionId,
    values: {},
  } as never);
  vi.mocked(getAttachedApplicationForm).mockResolvedValue({
    fields: [{
      columnSpan: 1,
      key: "BUSINESS_REGISTRATION_DOCUMENT",
      label: "Business registration document",
      order: 1,
      required: true,
      sectionId: "59e20de0-3558-4d63-90a4-8c9f5125df07",
      type: "DOCUMENT",
    }],
    instructions: null,
    sections: [{
      columnSpan: 1,
      description: "",
      id: "59e20de0-3558-4d63-90a4-8c9f5125df07",
      key: "DOCUMENTS",
      order: 1,
      showContainer: true,
      title: "Documents",
    }],
    submitLabel: "Submit",
    versionId: formVersionId,
    versionNumber: 1,
  });
  vi.mocked(listLatestOwnedApplicationDocumentVersions).mockResolvedValue([]);
  vi.mocked(createPendingApplicationDocumentVersion).mockResolvedValue({
    id: versionId,
    versionNumber: 1,
  });
  vi.mocked(finalizeApplicationDocumentVersion).mockResolvedValue(true);
});

describe("application document service", () => {
  it("enforces canonical document permissions before repository access", async () => {
    const unauthorized = { ...actor, capabilities: new Set<string>() };
    await expect(
      getOwnApplicationDocuments(unauthorized, applicationId),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findOwnedApplication).not.toHaveBeenCalled();
  });

  it("returns requirements from the exact form version", async () => {
    await expect(
      getOwnApplicationDocuments(actor, applicationId),
    ).resolves.toMatchObject({
      documents: [],
      requirements: [{ key: "BUSINESS_REGISTRATION_DOCUMENT", required: true }],
    });
    expect(getAttachedApplicationForm).toHaveBeenCalledWith(
      formVersionId,
      fundingOpportunityId,
    );
  });

  it("rejects content whose signature does not match its extension", async () => {
    const adapter = storage();
    const disguised = new File(["not a PDF"], "registration.pdf", {
      type: "application/pdf",
    });
    await expect(uploadOwnApplicationDocument(
      actor,
      applicationId,
      "BUSINESS_REGISTRATION_DOCUMENT",
      disguised,
      adapter,
    )).rejects.toBeInstanceOf(InvalidApplicationDocumentError);
    expect(adapter.put).not.toHaveBeenCalled();
  });

  it("rejects a requirement that is not visible in the bound form", async () => {
    await expect(uploadOwnApplicationDocument(
      actor,
      applicationId,
      "UNCONFIGURED_DOCUMENT",
      pdf(),
      storage(),
    )).rejects.toBeInstanceOf(InvalidApplicationDocumentError);
    expect(createPendingApplicationDocumentVersion).not.toHaveBeenCalled();
  });

  it("persists a checksummed version before finalizing opaque storage", async () => {
    const adapter = storage();
    await uploadOwnApplicationDocument(
      actor,
      applicationId,
      "BUSINESS_REGISTRATION_DOCUMENT",
      pdf("../registration.pdf"),
      adapter,
    );
    expect(createPendingApplicationDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        originalName: "registration.pdf",
        requirementKey: "BUSINESS_REGISTRATION_DOCUMENT",
      }),
    );
    expect(adapter.put).toHaveBeenCalledWith(expect.objectContaining({
      objectKey: expect.stringMatching(
        new RegExp(`^users/${actor.id}/${applicationId}/BUSINESS_REGISTRATION_DOCUMENT/`),
      ),
    }));
    expect(finalizeApplicationDocumentVersion).toHaveBeenCalledWith(versionId);
  });

  it("records a reconcilable failure when object storage fails", async () => {
    const adapter = storage();
    vi.mocked(adapter.put).mockRejectedValue(new Error("storage unavailable"));
    await expect(uploadOwnApplicationDocument(
      actor,
      applicationId,
      "BUSINESS_REGISTRATION_DOCUMENT",
      pdf(),
      adapter,
    )).rejects.toThrow("storage unavailable");
    expect(failApplicationDocumentVersion).toHaveBeenCalledWith(
      versionId,
      "STORAGE_FINALIZATION_FAILED",
    );
    expect(adapter.delete).toHaveBeenCalledWith(
      expect.stringContaining("BUSINESS_REGISTRATION_DOCUMENT"),
    );
  });

  it("creates signed access only for an owner-scoped clean version", async () => {
    const adapter = storage();
    vi.mocked(findOwnedDownloadableApplicationDocumentVersion)
      .mockResolvedValue({
        objectKey: "users/owner/application/version.pdf",
        originalName: "registration.pdf",
      });
    await expect(createOwnApplicationDocumentDownload(
      actor,
      applicationId,
      versionId,
      adapter,
    )).resolves.toBe("https://signed.test");
    expect(findOwnedDownloadableApplicationDocumentVersion).toHaveBeenCalledWith(
      actor.id,
      applicationId,
      versionId,
    );
    expect(adapter.createSignedDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "registration.pdf",
        objectKey: "users/owner/application/version.pdf",
      }),
    );
  });
});
