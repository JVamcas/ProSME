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
          ruleSetName: "SME eligibility",
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
}));

vi.mock("@/shared/ui/FormRichTextField", () => ({
  FormRichTextField: ({ label }: { label: string }) => <div>{label}</div>,
}));

const call: FundingCallView = {
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
  reference: "SME-2027-01",
  rowVersion: 1,
  slug: "sme-growth-fund-2027",
  status: "DRAFT",
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
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

    expect(container.querySelector<HTMLSelectElement>(
      '[name="workflowTemplateVersionId"]',
    )?.value).toBe(workflowVersionId);
    expect(container.textContent).toContain(
      "Standard workflow — version 1 · DRAFT",
    );
    expect(container.querySelector<HTMLSelectElement>(
      '[name="formVersionId"]',
    )?.value).toBe(formVersionId);
    expect(container.querySelector<HTMLSelectElement>(
      '[name="eligibilityRuleSetVersionId"]',
    )?.value).toBe(eligibilityVersionId);
  });
});
