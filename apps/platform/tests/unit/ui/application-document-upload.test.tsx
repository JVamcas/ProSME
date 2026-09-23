import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const useApplicationDocuments = vi.hoisted(() => vi.fn());
const useUploadApplicationDocument = vi.hoisted(() => vi.fn());

vi.mock("@/modules/applications/ui/useApplicationDocuments", () => ({
  useApplicationDocuments,
  useUploadApplicationDocument,
}));

import { ApplicationDocumentsForm } from "@/components/applicant/applications/ApplicationDocumentsForm";

describe("application document upload", () => {
  it("renders requirements from the bound form configuration", () => {
    useApplicationDocuments.mockReturnValue({
      data: {
        documents: [],
        requirements: [{
          acceptedExtensions: [".pdf"],
          key: "BUSINESS_REGISTRATION_DOCUMENT",
          label: "Business Registration Certificate",
          maximumBytes: 10485760,
          maximumFiles: 1,
          required: true,
          sectionKey: "DOCUMENTS",
          sectionTitle: "Documents",
        }],
      },
      error: null,
      isError: false,
      isPending: false,
    });
    useUploadApplicationDocument.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn(),
      variables: undefined,
    });
    const markup = renderToStaticMarkup(
      <ApplicationDocumentsForm
        applicationId="99e20de0-3558-4d63-90a4-8c9f5125df07"
        onContinue={() => Promise.resolve()}
        pending={false}
      />,
    );
    expect(markup).toContain("Business Registration Certificate");
    expect(markup).toContain("security scanning");
    expect(markup).toContain("Save and continue");
  });
});
