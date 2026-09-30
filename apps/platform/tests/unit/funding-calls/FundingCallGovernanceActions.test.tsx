// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallGovernanceActions } from "@/modules/funding-calls/ui/FundingCallGovernanceActions";

const governance = vi.hoisted(() => ({
  error: null as Error | null,
  isPending: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
}));
const toast = vi.hoisted(() => ({ error: vi.fn() }));

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useChangeFundingCallGovernanceStatus: () => governance,
}));
vi.mock("sonner", () => ({ toast }));

const call: FundingCallView = {
  applicationDuplicatePolicy: "one_per_business",
  closesAt: "2027-03-31T15:00:00.000Z",
  createdAt: "2026-09-20T08:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: null,
  eligibilitySummary: null,
  formVersionId: null,
  fundingInstrument: "Grant",
  id: "40000000-0000-4000-8000-000000000001",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  rowVersion: 4,
  slug: "sme-growth-fund-2027",
  status: "APPROVAL_PENDING",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: "2026-09-20T08:00:00.000Z",
  workflowTemplateVersionId: null,
};

let root: Root | undefined;

beforeEach(() => {
  governance.error = null;
  governance.isPending = false;
  governance.mutate.mockReset();
  governance.mutateAsync.mockReset().mockResolvedValue(undefined);
  toast.error.mockReset();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("funding call governance actions", () => {
  it("collects the return reason in a dialog", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <FundingCallGovernanceActions
        call={call}
        canApprove={false}
        canReturn
        canSubmit={false}
        canWithdrawOwnRequest={false}
      />,
    ));

    expect(document.querySelector("textarea")).toBeNull();
    const openButton = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Return for amendment",
    );
    await act(async () => openButton?.click());

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Return reason");
    expect(dialog?.querySelector("textarea")).not.toBeNull();
    const cancelButton = [...dialog!.querySelectorAll("button")].find(
      (button) => button.textContent === "Cancel",
    );
    expect(cancelButton).toBeDefined();
    await act(async () => cancelButton?.click());

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("uses preparation authority to submit a Draft for approval", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <FundingCallGovernanceActions
        call={{ ...call, status: "DRAFT" }}
        canApprove={false}
        canReturn={false}
        canSubmit
        canWithdrawOwnRequest={false}
      />,
    ));
    const submitButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Submit for approval",
    );
    await act(async () => submitButton?.click());

    expect(governance.mutate).toHaveBeenCalledWith(
      {
        command: "SUBMIT_FOR_APPROVAL",
        expectedRowVersion: call.rowVersion,
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("shows governance failures as a toast instead of inline text", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <FundingCallGovernanceActions
        call={{ ...call, status: "DRAFT" }}
        canApprove={false}
        canReturn={false}
        canSubmit
        canWithdrawOwnRequest={false}
      />,
    ));
    const submitButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Submit for approval",
    );
    await act(async () => submitButton?.click());
    const options = governance.mutate.mock.calls[0]?.[1];

    await act(async () => {
      options.onError(new Error("The selected eligibility ruleset is not published."));
    });

    expect(toast.error).toHaveBeenCalledWith(
      "The selected eligibility ruleset is not published.",
    );
    expect(container.textContent).not.toContain(
      "The selected eligibility ruleset is not published.",
    );
  });
});
