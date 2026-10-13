import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";
import type { FormWorkflowDocument } from "@/modules/forms/domain/FormWorkflowDocument";

const { taskQuery, uploadMutation } = vi.hoisted(() => ({
  taskQuery: vi.fn(),
  uploadMutation: vi.fn(),
}));
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useWorkflowTask: taskQuery,
  useUploadWorkflowTaskDocument: uploadMutation,
}));

function preview(uploader: FormWorkflowDocument["uploader"], required = true) {
  const definition = runtimeDefinition();
  definition.fields = [{
    key: "VERIFICATION_EVIDENCE",
    label: "Verification evidence",
    sectionId: definition.sections[0].id!,
    columnSpan: 3,
    order: 1,
    type: "DOCUMENT",
    required,
    workflowDocument: {
      stableKey: "VERIFICATION_EVIDENCE",
      acceptedFileTypes: ["PDF", "DOCX"],
      maximumSizeMb: 17,
      expiryDays: null,
      requestOnStageActivation: false,
      uploader,
      verifier: "ASSIGNED_REVIEWER",
      templateReference: "",
    },
  }];
  return renderToStaticMarkup(
    <FormRenderer
      definition={definition}
      formData={{}}
      onChange={() => undefined}
      onSubmit={() => undefined}
    >
      <></>
    </FormRenderer>,
  );
}

describe("workflow document preview", () => {
  it.each(["STAFF", "ASSIGNED_REVIEWER"] as const)(
    "renders the configured document card with disabled upload for %s",
    (uploader) => {
      const markup = preview(uploader);
      expect(markup).toContain("Verification evidence");
      expect(markup).toContain("PDF, DOCX");
      expect(markup).toContain("17 MB");
      expect(markup).toContain('class="ml-1 text-brand-orange">*</span>');
      expect(markup).toContain("Upload file");
      expect(markup).toMatch(/<input[^>]*disabled=""[^>]*type="file"/);
      expect(markup).toMatch(/<button[^>]*disabled=""/);
      expect(markup).not.toContain("Workflow document evidence");
      expect(taskQuery).not.toHaveBeenCalled();
      expect(uploadMutation).not.toHaveBeenCalled();
    },
  );

  it("preserves applicant instructions and optional status", () => {
    const markup = preview("APPLICANT", false);
    expect(markup).toContain("To be submitted by the applicant");
    expect(markup).not.toContain("Upload file");
    expect(markup).not.toContain('class="ml-1 text-brand-orange">*</span>');
  });
});
