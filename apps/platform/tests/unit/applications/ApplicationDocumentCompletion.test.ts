import { describe, expect, it } from "vitest";

import type {
  ApplicationDocumentRegister,
  ApplicationDocumentView,
} from "@/modules/applications/api/ApplicationDocumentSchemas";
import { applicationDocumentCompletion } from "@/modules/applications/domain/ApplicationDocumentPolicy";

function document(
  requirementKey: string,
  storageStatus: ApplicationDocumentView["storageStatus"],
): ApplicationDocumentView {
  return {
    contentType: "application/pdf",
    fileName: `${requirementKey}.pdf`,
    requirementKey,
    sizeBytes: 100,
    storageStatus,
    uploadedAt: "2026-09-23T00:00:00.000Z",
    versionId: crypto.randomUUID(),
    versionNumber: 1,
  };
}

function register(documents: ApplicationDocumentView[]): ApplicationDocumentRegister {
  return {
    documents,
    requirements: [
      {
        acceptedExtensions: [".pdf"],
        key: "REGISTRATION",
        label: "Registration",
        maximumBytes: 1024,
        maximumFiles: 1,
        required: true,
        sectionKey: "ENTITY",
        sectionTitle: "Entity",
      },
      {
        acceptedExtensions: [".pdf"],
        key: "TAX",
        label: "Tax",
        maximumBytes: 1024,
        maximumFiles: 1,
        required: true,
        sectionKey: "ENTITY",
        sectionTitle: "Entity",
      },
      {
        acceptedExtensions: [".pdf"],
        key: "OPTIONAL",
        label: "Optional evidence",
        maximumBytes: 1024,
        maximumFiles: 1,
        required: false,
        sectionKey: "ENTITY",
        sectionTitle: "Entity",
      },
    ],
  };
}

describe("application document completion", () => {
  it("counts only required versions that are finalized", () => {
    expect(applicationDocumentCompletion(register([
      document("REGISTRATION", "finalized"),
      document("TAX", "finalized"),
      document("OPTIONAL", "finalized"),
    ]))).toEqual({ completedCount: 2, requiredCount: 2 });

    expect(applicationDocumentCompletion(register([
      document("REGISTRATION", "pending"),
      document("TAX", "failed"),
    ]))).toEqual({ completedCount: 0, requiredCount: 2 });
  });
});
