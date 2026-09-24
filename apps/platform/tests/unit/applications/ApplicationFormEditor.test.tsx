// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApplicationDraftView } from "@/modules/applications/ApplicationTypes";
import { ApplicationFormEditor } from "@/modules/applications/ui/ApplicationFormEditor";
import { runtimeDefinition } from "../../support/form-runtime";

const mocks = vi.hoisted(() => ({
  draft: null as ApplicationDraftView | null,
  refetch: vi.fn(),
  preflight: vi.fn(),
  submit: vi.fn(),
  toastError: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/shared/ui/Toast", () => ({
  toast: { error: mocks.toastError },
}));

vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useSubmitApplication: () => ({ isPending: false, mutateAsync: mocks.submit }),
  useOwnApplication: () => ({
    data: mocks.draft,
    isError: false,
    isPending: false,
    refetch: mocks.refetch,
  }),
  useUpdateApplication: () => ({
    error: null,
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/modules/applications/ui/useApplicationReadiness", () => ({
  useApplicationPreflight: () => ({
    isPending: false,
    mutateAsync: mocks.preflight,
  }),
}));

vi.mock("@/modules/applications/ui/useApplicationDocuments", () => ({
  useApplicationDocuments: () => ({
    data: { documents: [], requirements: [] },
    isError: false,
    isPending: false,
  }),
}));

const applicationId = "20000000-0000-4000-8000-000000000001";

function draft(rowVersion: number): ApplicationDraftView {
  const form = runtimeDefinition();
  const secondSectionId = "10000000-0000-4000-8000-000000000002";
  form.displayMode = "STEPS";
  form.sections = [
    form.sections[0],
    {
      ...form.sections[0],
      id: secondSectionId,
      key: "ADDITIONAL_DETAILS",
      order: 2,
      title: "Additional details",
    },
  ];
  form.fields = form.fields
    .filter((field) => field.key === "NAME" || field.key === "NOTES")
    .map((field) => field.key === "NOTES"
      ? { ...field, order: 1, sectionId: secondSectionId }
      : field);

  return {
    reference: null,
    submittedAt: null,
    publicStatus: {
      status: "DRAFT",
      label: "Draft",
      description: "Complete and submit your application.",
      actionRequired: false,
    },
    businessName: "Selected business",
    businessSection: {},
    createdAt: "2026-09-23T08:00:00.000Z",
    currentSection: "business",
    declarationsSection: {},
    draftResponse: {
      id: "30000000-0000-4000-8000-000000000001",
      rowVersion,
      updatedAt: "2026-09-23T08:00:00.000Z",
      values: { NAME: "Selected business", NOTES: "Draft answer" },
    },
    eligibilityRuleSetVersionId: "40000000-0000-4000-8000-000000000001",
    financialSection: {},
    form,
    formVersionId: form.versionId,
    fundingOpportunityId: "60000000-0000-4000-8000-000000000001",
    fundingOpportunityTitle: "Growth Fund",
    id: applicationId,
    progressPercent: 0,
    projectSection: {},
    rowVersion,
    sectionCompletion: {
      business: false,
      declarations: false,
      documents: false,
      financial: false,
      project: false,
    },
    status: "draft",
    updatedAt: "2026-09-23T08:00:00.000Z",
  };
}

afterEach(() => {
  mocks.draft = null;
  mocks.refetch.mockReset();
  mocks.preflight.mockReset();
  mocks.submit.mockReset();
  mocks.toastError.mockReset();
  sessionStorage.clear();
  document.body.replaceChildren();
});

describe("application form editor", () => {
  it("keeps the current step when autosave updates the draft version", async () => {
    mocks.draft = draft(4);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApplicationFormEditor applicationId={applicationId} />);
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    expect(container.textContent).toContain("Step 2 of 2: Additional details");

    mocks.draft = draft(5);
    await act(async () => {
      root.render(<ApplicationFormEditor applicationId={applicationId} />);
    });
    expect(container.textContent).toContain("Step 2 of 2: Additional details");

    await act(async () => root.unmount());
  });

  it("submits the saved draft from the final step", async () => {
    mocks.draft = draft(4);
    mocks.preflight.mockResolvedValue({
      applicationRowVersion: 4,
      blockers: [],
      readinessToken: "ready-token",
      ready: true,
    });
    mocks.submit.mockResolvedValue({
      applicationId,
      reference: "SME-001",
      submittedAt: "2026-09-23T08:00:00.000Z",
      workflowInstanceId: "workflow-1",
      workflowTemplateVersionId: "template-1",
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApplicationFormEditor applicationId={applicationId} />);
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    const submitButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Submit application");
    expect(submitButton).toBeDefined();
    expect(submitButton?.disabled).toBe(false);

    await act(async () => {
      submitButton?.click();
    });
    expect(mocks.preflight).toHaveBeenCalledOnce();
    expect(mocks.submit).toHaveBeenCalledWith({
      expectedApplicationRowVersion: 4,
      finalConfirmation: true,
      readinessToken: "ready-token",
    });
    expect(container.textContent).toContain("Application submitted");
    expect(container.textContent).toContain("SME-001");

    await act(async () => root.unmount());
  });

  it("shows preflight blockers without submitting", async () => {
    mocks.draft = draft(4);
    mocks.preflight.mockResolvedValue({
      applicationRowVersion: 4,
      blockers: [{ message: "A required document is missing." }],
      readinessToken: null,
      ready: false,
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApplicationFormEditor applicationId={applicationId} />);
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Submit application")
        ?.click();
    });
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Application is not ready to submit",
      { description: "A required document is missing." },
    );
    expect(mocks.submit).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
