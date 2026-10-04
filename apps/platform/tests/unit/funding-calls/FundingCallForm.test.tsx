// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallForm } from "@/modules/funding-calls/ui/FundingCallForm";

const optionState = vi.hoisted(() => ({ pending: true }));
const workflowVersionId = "10000000-0000-4000-8000-000000000001";
const formVersionId = "20000000-0000-4000-8000-000000000001";
const eligibilityVersionId = "30000000-0000-4000-8000-000000000001";

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useBindableApplicationFormVersions: () => optionState.pending
    ? { data: undefined, isPending: true }
    : {
        data: [{
          formName: "Funding application",
          status: "DRAFT",
          versionId: formVersionId,
          versionNumber: 1,
        }],
        isPending: false,
      },
  useBindableEligibilityRuleSetVersions: () => optionState.pending
    ? { data: undefined, isPending: true }
    : {
        data: [{
          ruleSetId: "30000000-0000-4000-8000-000000000002",
          ruleSetName: "SME Fund eligibility",
          status: "DRAFT",
          versionId: eligibilityVersionId,
          versionNumber: 1,
        }],
        isPending: false,
      },
  useBindableWorkflowTemplateVersions: () => optionState.pending
    ? { data: undefined, isPending: true }
    : {
        data: [{
          name: "Standard workflow",
          status: "DRAFT",
          versionId: workflowVersionId,
          versionNumber: 1,
        }],
        isPending: false,
      },
  useSaveFundingCallCreationProgress: () => ({
    error: null,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/shared/ui/FormRichTextField", () => ({
  FormRichTextField: ({ label }: { label: string }) => <div>{label}</div>,
}));

const call: FundingCallView = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business",
  closesAt: "2027-03-31T15:00:00.000Z",
  createdAt: "2026-09-20T08:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: eligibilityVersionId,
  eligibilitySummary: null,
  formVersionId,
  fundingInstrument: "Grant",
  id: "40000000-0000-4000-8000-000000000001",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  rowVersion: 1,
  slug: "sme-growth-fund-2027",
  status: "DRAFT",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: "2026-09-20T08:00:00.000Z",
  workflowTemplateVersionId: workflowVersionId,
};

let root: Root | undefined;

afterEach(async () => {
  optionState.pending = true;
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("FundingCallForm", () => {
  it("restores an incomplete creation draft at its saved step", async () => {
    optionState.pending = false;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <FundingCallForm
          creationProgress={{
            currentStep: "funding",
            id: "50000000-0000-4000-8000-000000000001",
            rowVersion: 3,
            updatedAt: "2026-09-29T08:00:00.000Z",
            values: {
              allowResubmissionAfterWithdrawal: false,
              applicationDuplicatePolicy: "one_per_business",
              closesAt: "",
              description: "",
              eligibilityRuleSetVersionId: "",
              eligibilitySummary: "",
              formVersionId: "",
              fundingInstrument: "",
              maximumGrantAmount: "",
              minimumGrantAmount: "",
              opensAt: "",
              publicContactEmail: "",
              publicContactName: "",
              publicContactPhone: "",
              thematicArea: "",
              title: "Partially completed call",
              totalBudgetEnvelope: "250000",
              workflowTemplateVersionId: "",
            },
          }}
          onSubmit={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Funding details");
    expect(container.querySelector<HTMLInputElement>(
      '[name="totalBudgetEnvelope"]',
    )?.value).toBe("250,000");
    expect(container.textContent).toContain("Changes saved");
  });

  it("restores saved bindings after asynchronous options load", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const render = () => (
      <FundingCallForm call={call} onSubmit={vi.fn()} />
    );

    await act(async () => root?.render(render()));
    optionState.pending = false;
    await act(async () => root?.render(render()));

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label^="Workflow,"]',
      )?.click();
    });

    expect(container.querySelector<HTMLSelectElement>(
      '[name="workflowTemplateVersionId"]',
    )?.value).toBe(workflowVersionId);
    expect(container.textContent).toContain(
      "Standard workflow — version 1 · DRAFT",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label^="Application,"]',
      )?.click();
    });
    expect(container.querySelector<HTMLSelectElement>(
      '[name="formVersionId"]',
    )?.value).toBe(formVersionId);

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label^="Eligibility,"]',
      )?.click();
    });
    expect(container.querySelector<HTMLSelectElement>(
      '[name="eligibilityRuleSetVersionId"]',
    )?.value).toBe(eligibilityVersionId);
  });

  it("renders one focused step and keeps document requirements in the application form", async () => {
    optionState.pending = false;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<FundingCallForm call={call} onSubmit={vi.fn()} />);
    });

    expect(container.textContent).toContain("Basic information");
    expect(container.textContent).not.toContain("Funding details");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label^="Application,"]',
      )?.click();
    });

    expect(container.textContent).toContain(
      "required document uploads are defined by this Application Form Version",
    );
    expect(container.querySelector('[name="requiredDocuments"]')).toBeNull();
    expect(container.textContent).not.toContain("Basic information");
  });

  it("shows funding amounts in fixed Namibian dollars", async () => {
    optionState.pending = false;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<FundingCallForm call={call} onSubmit={vi.fn()} />);
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label^="Funding,"]',
      )?.click();
    });

    expect(container.textContent).toContain("All amounts are in Namibian dollars");
    expect(container.textContent?.match(/N\$/g)).toHaveLength(3);
  });
});
