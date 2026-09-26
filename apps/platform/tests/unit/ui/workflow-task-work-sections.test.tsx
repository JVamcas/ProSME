import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";

const documentRequirements = [{
  acceptedFileTypes: ["PDF" as const],
  expiryDays: null,
  mandatory: true,
  maximumSizeMb: 10,
  name: "Supporting document",
  templateReference: "",
  uploader: "APPLICANT" as const,
  verifier: "STAFF" as const,
}];

function renderSections(
  displayMode: "SECTIONS" | "STEP_PROGRESS",
  formStatus: string,
) {
  return renderToStaticMarkup(
    <WorkflowTaskWorkSections
      checklistItems={[]}
      commentFields={[]}
      disabled={false}
      displayMode={displayMode}
      documentRequirements={documentRequirements}
      finalActions={<button type="button">Approve and advance</button>}
      form={{ content: <p>Form content</p>, title: "Form" }}
      scoring={null}
      status={{
        checklist: "Required",
        comments: "Required",
        documents: "Required",
        form: formStatus,
        scoring: "Required",
      }}
    />,
  );
}

describe("workflow task work sections", () => {
  it("hides workflow actions before the final step", () => {
    const markup = renderSections("STEP_PROGRESS", "Required");

    expect(markup).toContain("Form content");
    expect(markup).not.toContain("Approve and advance");
  });

  it("shows workflow actions on the final step", () => {
    const markup = renderSections("STEP_PROGRESS", "Completed");

    expect(markup).toContain("Supporting document");
    expect(markup).toContain("Approve and advance");
  });

  it("does not put final-step actions into section view", () => {
    const markup = renderSections("SECTIONS", "Completed");

    expect(markup).not.toContain("Approve and advance");
  });
});
