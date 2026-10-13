import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationDocumentPageReader",
  () => ({
    readApplicationDocumentPageCount: vi.fn(),
  }),
);
import { readApplicationDocumentPageCount } from "@/modules/applications/infrastructure/ApplicationDocumentPageReader";
import { readValidatedWorkflowEvidence } from "@/modules/workflows/application/evidence/WorkflowEvidenceFileValidation";
import type { WorkflowEvidenceRequirement } from "@/modules/workflows/application/evidence/WorkflowEvidenceFilePolicy";

const requirement: WorkflowEvidenceRequirement = {
  acceptedFileTypes: ["PDF"],
  acceptedExtensions: [".pdf"],
  maximumSizeMb: 4,
  maxPages: 3,
};
beforeEach(() => vi.clearAllMocks());

describe("workflow document standard file limits", () => {
  it("checks PDF page limits before returning upload bytes", async () => {
    vi.mocked(readApplicationDocumentPageCount).mockResolvedValue(4);
    await expect(
      readValidatedWorkflowEvidence(
        new File(["%PDF-test"], "evidence.pdf", { type: "application/pdf" }),
        requirement,
      ),
    ).rejects.toThrow("maximum is 3 pages");
    vi.mocked(readApplicationDocumentPageCount).mockResolvedValue(3);
    await expect(
      readValidatedWorkflowEvidence(
        new File(["%PDF-test"], "evidence.pdf", { type: "application/pdf" }),
        requirement,
      ),
    ).resolves.toMatchObject({
      extension: ".pdf",
      contentType: "application/pdf",
    });
  });
  it("rejects the wrong type, size and signature", async () => {
    await expect(
      readValidatedWorkflowEvidence(
        new File(["text"], "evidence.txt"),
        requirement,
      ),
    ).rejects.toThrow("file types");
    await expect(
      readValidatedWorkflowEvidence(
        new File([new Uint8Array(5 * 1024 * 1024)], "large.pdf"),
        requirement,
      ),
    ).rejects.toThrow("4 MB");
    await expect(
      readValidatedWorkflowEvidence(
        new File(["not a PDF"], "evidence.pdf"),
        requirement,
      ),
    ).rejects.toThrow("content");
    expect(readApplicationDocumentPageCount).not.toHaveBeenCalled();
  });
  it("supports standard CSV and spreadsheet formats with exact extension selection", async () => {
    await expect(
      readValidatedWorkflowEvidence(
        new File(["a,b\n1,2"], "evidence.csv", { type: "text/csv" }),
        {
          acceptedFileTypes: ["CSV"],
          acceptedExtensions: [".csv"],
          maximumSizeMb: 1,
        },
      ),
    ).resolves.toMatchObject({ extension: ".csv" });
    await expect(
      readValidatedWorkflowEvidence(
        new File(["PK[Content_Types].xml xl/workbook.xml"], "evidence.xlsx"),
        {
          acceptedFileTypes: ["XLSX"],
          acceptedExtensions: [".xlsx"],
          maximumSizeMb: 1,
        },
      ),
    ).resolves.toMatchObject({ extension: ".xlsx" });
    await expect(
      readValidatedWorkflowEvidence(
        new File([new Uint8Array([255, 216])], "evidence.jpeg"),
        {
          acceptedFileTypes: ["JPG"],
          acceptedExtensions: [".jpg"],
          maximumSizeMb: 1,
        },
      ),
    ).rejects.toThrow("file types");
  });
});
