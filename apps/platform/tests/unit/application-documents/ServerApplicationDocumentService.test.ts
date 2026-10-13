import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const parser = vi.hoisted(() => ({
  getInfo: vi.fn(),
  destroy: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getInfo = parser.getInfo;
    destroy = parser.destroy;
  },
}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationDocumentRepository",
  () => ({
    createPendingApplicationDocumentVersion: vi.fn(),
    failApplicationDocumentVersion: vi.fn(),
    finalizeApplicationDocumentVersion: vi.fn(),
    findOwnedDownloadableApplicationDocumentVersion: vi.fn(),
    listAbandonedApplicationDocumentObjects: vi.fn(),
    listLatestOwnedApplicationDocumentVersions: vi.fn(),
    markApplicationDocumentVersionAbandoned: vi.fn(),
  }),
);
vi.mock("@/modules/applications/infrastructure/ApplicationRepository", () => ({
  findOwnedApplication: vi.fn(),
}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationResponseRepository",
  () => ({
    readOwnedApplicationDraftResponse: vi.fn(),
  }),
);
vi.mock(
  "@/modules/applications/infrastructure/AttachedApplicationFormRepository",
  () => ({
    getAttachedApplicationForm: vi.fn(),
  }),
);

import { condition } from "../../support/FormFieldRuleFixture";
import { PermissionDeniedError } from "@/auth/authorization/policy";
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

import {
  applicationId,
  fundingOpportunityId,
  formVersionId,
  versionId,
  actor,
  pdf,
  storage,
} from "../../support/ApplicationDocumentServiceFixture";

beforeEach(() => {
  vi.clearAllMocks();
  parser.getInfo.mockResolvedValue({ total: 5 });
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
    fields: [
      {
        columnSpan: 1,
        key: "BUSINESS_REGISTRATION_DOCUMENT",
        label: "Business registration document",
        order: 1,
        required: true,
        sectionId: "59e20de0-3558-4d63-90a4-8c9f5125df07",
        type: "DOCUMENT",
      },
    ],
    instructions: null,
    sections: [
      {
        columnSpan: 1,
        description: "",
        id: "59e20de0-3558-4d63-90a4-8c9f5125df07",
        key: "DOCUMENTS",
        order: 1,
        showContainer: true,
        title: "Documents",
      },
    ],
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
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        disguised,
        adapter,
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationDocumentError);
    expect(adapter.put).not.toHaveBeenCalled();
  });

  it("rejects a requirement that is not visible in the bound form", async () => {
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "UNCONFIGURED_DOCUMENT",
        pdf(),
        storage(),
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationDocumentError);
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
    expect(adapter.put).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: expect.stringMatching(
          new RegExp(
            `^local/users/${actor.id}/${applicationId}/BUSINESS_REGISTRATION_DOCUMENT/`,
          ),
        ),
      }),
    );
    expect(finalizeApplicationDocumentVersion).toHaveBeenCalledWith(versionId);
  });

  it("records a reconcilable failure when object storage fails", async () => {
    const adapter = storage();
    vi.mocked(adapter.put).mockRejectedValue(new Error("storage unavailable"));
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        pdf(),
        adapter,
      ),
    ).rejects.toThrow("storage unavailable");
    expect(failApplicationDocumentVersion).toHaveBeenCalledWith(
      versionId,
      "STORAGE_FINALIZATION_FAILED",
    );
    expect(adapter.delete).toHaveBeenCalledWith(
      expect.stringContaining("BUSINESS_REGISTRATION_DOCUMENT"),
    );
  });

  it("reads content only for an owner-scoped clean version", async () => {
    const adapter = storage();
    vi.mocked(
      findOwnedDownloadableApplicationDocumentVersion,
    ).mockResolvedValue({
      contentType: "application/pdf",
      objectKey: "users/owner/application/version.pdf",
      originalName: "registration.pdf",
    });
    await expect(
      createOwnApplicationDocumentDownload(
        actor,
        applicationId,
        versionId,
        adapter,
      ),
    ).resolves.toEqual({
      body: Buffer.from("document"),
      contentType: "application/pdf",
      fileName: "registration.pdf",
    });
    expect(
      findOwnedDownloadableApplicationDocumentVersion,
    ).toHaveBeenCalledWith(actor.id, applicationId, versionId);
    expect(adapter.read).toHaveBeenCalledWith(
      "users/owner/application/version.pdf",
    );
  });
});

describe("configured application document limits", () => {
  it.each([5, 12])("accepts exactly %i pages", async (maxPages) => {
    const form = await getAttachedApplicationForm(
      formVersionId,
      fundingOpportunityId,
    );
    form!.fields[0].maxPages = maxPages;
    parser.getInfo.mockResolvedValue({ total: maxPages });
    const adapter = storage();
    await uploadOwnApplicationDocument(
      actor,
      applicationId,
      "BUSINESS_REGISTRATION_DOCUMENT",
      pdf(),
      adapter,
    );
    expect(adapter.put).toHaveBeenCalledOnce();
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it.each([5, 12])(
    "rejects documents exceeding %i pages before storage",
    async (maxPages) => {
      const form = await getAttachedApplicationForm(
        formVersionId,
        fundingOpportunityId,
      );
      form!.fields[0].maxPages = maxPages;
      parser.getInfo.mockResolvedValue({ total: maxPages + 1 });
      const adapter = storage();
      await expect(
        uploadOwnApplicationDocument(
          actor,
          applicationId,
          "BUSINESS_REGISTRATION_DOCUMENT",
          pdf(),
          adapter,
        ),
      ).rejects.toThrow(`The maximum is ${maxPages} pages`);
      expect(adapter.put).not.toHaveBeenCalled();
      expect(createPendingApplicationDocumentVersion).not.toHaveBeenCalled();
      expect(parser.destroy).toHaveBeenCalledOnce();
    },
  );

  it("rejects unreadable PDFs and non-PDF files for page-limited fields", async () => {
    const form = await getAttachedApplicationForm(
      formVersionId,
      fundingOpportunityId,
    );
    form!.fields[0].maxPages = 5;
    parser.getInfo.mockRejectedValue(new Error("encrypted"));
    const adapter = storage();
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        pdf(),
        adapter,
      ),
    ).rejects.toThrow("The page count could not be read");
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        new File(["PK"], "deck.docx"),
        adapter,
      ),
    ).rejects.toThrow("Choose a PDF so its page count can be checked");
    expect(createPendingApplicationDocumentVersion).not.toHaveBeenCalled();
    expect(adapter.put).not.toHaveBeenCalled();
  });

  it("enforces the configured file-size limit before parsing or storage", async () => {
    const form = await getAttachedApplicationForm(
      formVersionId,
      fundingOpportunityId,
    );
    form!.fields[0].maximumFileSizeMb = 1;
    const adapter = storage();
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        new File([new Uint8Array(1024 * 1024 + 1)], "deck.pdf"),
        adapter,
      ),
    ).rejects.toThrow("no larger than 1 MB");
    expect(parser.getInfo).not.toHaveBeenCalled();
    expect(adapter.put).not.toHaveBeenCalled();
  });
});

describe("configured allowed formats", () => {
  it.each([true, false])(
    "enforces the TXT selection: allowed=%s",
    async (allowed) => {
      const form = await getAttachedApplicationForm(
        formVersionId,
        fundingOpportunityId,
      );
      form!.fields[0].acceptedExtensions = allowed ? [".txt"] : [".pdf"];
      const adapter = storage();
      const upload = uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        new File(["Business profile"], "profile.txt", { type: "text/plain" }),
        adapter,
      );
      if (allowed) {
        await upload;
        expect(adapter.put).toHaveBeenCalledWith(
          expect.objectContaining({ contentType: "text/plain" }),
        );
      } else {
        await expect(upload).rejects.toThrow(
          "Choose an allowed file type: .pdf",
        );
        expect(adapter.put).not.toHaveBeenCalled();
        expect(createPendingApplicationDocumentVersion).not.toHaveBeenCalled();
      }
    },
  );
});

describe("document edit rules", () => {
  it("rejects uploads while the document field is conditionally locked", async () => {
    const form = await getAttachedApplicationForm(
      formVersionId,
      fundingOpportunityId,
    );
    form!.fields[0].rules = { editableCondition: condition("ENABLED") };
    const adapter = storage();
    await expect(
      uploadOwnApplicationDocument(
        actor,
        applicationId,
        "BUSINESS_REGISTRATION_DOCUMENT",
        pdf(),
        adapter,
      ),
    ).rejects.toThrow("is not editable under the current form rules");
    expect(adapter.put).not.toHaveBeenCalled();
    expect(createPendingApplicationDocumentVersion).not.toHaveBeenCalled();
  });
});
