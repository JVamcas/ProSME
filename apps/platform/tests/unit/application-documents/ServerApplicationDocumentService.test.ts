import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/ApplicationDocumentRepository", () => ({
  listOwnedApplicationDocuments: vi.fn(),
  replaceOwnedApplicationDocument: vi.fn(),
}));
vi.mock("@/db/repositories/ApplicationRepository", () => ({
  findOwnedApplication: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  listOwnedApplicationDocuments,
  replaceOwnedApplicationDocument,
} from "@/db/repositories/ApplicationDocumentRepository";
import { findOwnedApplication } from "@/db/repositories/ApplicationRepository";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  InvalidApplicationDocumentError,
  getOwnApplicationDocuments,
  uploadOwnApplicationDocument,
} from "@/modules/applications/ServerApplicationDocumentService";

const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
const actor = {
  capabilities: new Set([
    capabilities.documentReadOwn,
    capabilities.documentUploadOwn,
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
    delete: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findOwnedApplication).mockResolvedValue({ status: "draft" } as never);
  vi.mocked(listOwnedApplicationDocuments).mockResolvedValue([]);
  vi.mocked(replaceOwnedApplicationDocument).mockResolvedValue(null);
});

describe("application document service", () => {
  it("enforces document capabilities before repository access", async () => {
    const unauthorized: AuthenticatedUser = {
      ...actor,
      capabilities: new Set<string>(),
    };
    await expect(
      getOwnApplicationDocuments(unauthorized, applicationId),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findOwnedApplication).not.toHaveBeenCalled();
  });

  it("scopes document lists to an owned draft", async () => {
    await expect(
      getOwnApplicationDocuments(actor, applicationId),
    ).resolves.toEqual([]);
    expect(findOwnedApplication).toHaveBeenCalledWith(actor.id, applicationId);
    expect(listOwnedApplicationDocuments).toHaveBeenCalledWith(
      actor.id,
      applicationId,
    );
  });

  it("rejects content whose signature does not match its extension", async () => {
    const adapter = storage();
    const disguised = new File(["not a PDF"], "registration.pdf", {
      type: "application/pdf",
    });
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "business-registration",
        disguised,
        adapter,
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationDocumentError);
    expect(adapter.put).not.toHaveBeenCalled();
  });

  it("stores an opaque object and replaces owner-scoped metadata", async () => {
    const adapter = storage();
    await uploadOwnApplicationDocument(
      actor,
      applicationId,
      "business-registration",
      pdf("../registration.pdf"),
      adapter,
    );
    expect(adapter.put).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "application/pdf",
        objectKey: expect.stringMatching(
          new RegExp(
            `^users/${actor.id}/${applicationId}/business-registration/`,
          ),
        ),
      }),
    );
    expect(replaceOwnedApplicationDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        documentType: "business-registration",
        originalName: "registration.pdf",
        ownerUserId: actor.id,
      }),
    );
  });

  it("removes the new object when metadata persistence fails", async () => {
    const adapter = storage();
    vi.mocked(replaceOwnedApplicationDocument).mockRejectedValue(
      new Error("database unavailable"),
    );
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "business-registration",
        pdf(),
        adapter,
      ),
    ).rejects.toThrow("database unavailable");
    expect(adapter.delete).toHaveBeenCalledOnce();
  });
});
