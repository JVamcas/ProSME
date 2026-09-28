import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApplicationDocumentsPanel } from "@/modules/applications/ui/ApplicationOverviewPanels";
import { WorkflowTaskDocumentsSection } from "@/modules/workflows/ui/WorkflowTaskDocumentsSection";

describe("document download links", () => {
  it("renders application downloads as browser-managed anchors", () => {
    const markup = renderToStaticMarkup(
      <ApplicationDocumentsPanel
        documents={[{
          href: "/api/admin/applications/application-id/documents/version-id/download",
          key: "version-id",
          name: "evidence.pdf",
          sizeBytes: 1_024,
          type: "EVIDENCE",
        }]}
      />,
    );

    expect(markup).toContain("download=\"\"");
    expect(markup).toContain(
      "href=\"/api/admin/applications/application-id/documents/version-id/download\"",
    );
  });

  it("renders task downloads as browser-managed anchors", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskDocumentsSection
        disabled={false}
        requirements={[{
          acceptedFileTypes: ["PDF"],
          document: {
            contentType: "application/pdf",
            fileName: "evidence.pdf",
            sizeBytes: 1_024,
            uploadedAt: "2026-09-28T12:00:00.000Z",
            versionId: "version-id",
            versionNumber: 1,
          },
          expiryDays: null,
          id: "requirement-id",
          mandatory: true,
          maximumSizeMb: 10,
          name: "Evidence",
          requestStatus: "SUPPLIED",
          stableKey: "EVIDENCE",
          templateReference: "",
          uploader: "STAFF",
          verifier: "STAFF",
        }]}
        upload={{
          onFile: () => undefined,
          taskId: "task-id",
        }}
      />,
    );

    expect(markup).toContain("download=\"\"");
    expect(markup).toContain(
      "href=\"/api/admin/tasks/task-id/documents/version-id/download\"",
    );
  });
});
