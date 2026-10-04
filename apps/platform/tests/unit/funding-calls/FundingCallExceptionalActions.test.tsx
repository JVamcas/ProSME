// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallExceptionalActions } from "@/modules/funding-calls/ui/FundingCallExceptionalActions";

const mutation = vi.hoisted(() => ({
  error: null,
  isPending: false,
  mutateAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mutation.push }) }));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useChangeFundingCallLifecycleStatus: () => mutation,
}));

const call: FundingCallView = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business",
  closesAt: "2027-03-31T15:00:00.000Z",
  createdAt: "2026-09-20T08:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  eligibilitySummary: "Registered SMEs may qualify.",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  id: "40000000-0000-4000-8000-000000000001",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  rowVersion: 4,
  slug: "sme-growth-fund-2027",
  status: "SCHEDULED",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: "2026-09-20T08:00:00.000Z",
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};

let root: Root | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  mutation.mutateAsync.mockResolvedValue({ ...call, status: "DRAFT" });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

async function actionsFor(status: FundingCallView["status"], canAmend = false) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <FundingCallExceptionalActions
      call={{ ...call, status }}
      canArchive
      canResume
      canSuspend
      canWithdraw
      canWithdrawForAmendment={canAmend}
    />,
  ));
  const labels = [...container.querySelectorAll("button")]
    .map((button) => button.textContent);
  await act(async () => root?.unmount());
  root = undefined;
  container.remove();
  return labels;
}

describe("funding call exceptional actions", () => {
  it("only offers amendment with permission and never restores a permanently withdrawn call", async () => {
    await expect(actionsFor("APPROVED")).resolves.toEqual([]);
    await expect(actionsFor("APPROVED", true)).resolves.toEqual(["Withdraw and return to Draft"]);
    await expect(actionsFor("WITHDRAWN", true)).resolves.toEqual(["Archive"]);
  });

  it("explains the pipeline effect, requires a reason and opens the draft after success", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <FundingCallExceptionalActions
        call={call}
        canArchive={false}
        canResume={false}
        canSuspend={false}
        canWithdraw={false}
        canWithdrawForAmendment
      />,
    ));
    await act(async () => container.querySelector<HTMLButtonElement>("button")?.click());
    expect(document.body.textContent).toContain("deadlines will continue unchanged");
    const form = document.querySelector<HTMLFormElement>("form")!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mutation.mutateAsync).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("A reason is required.");
    const reason = document.querySelector<HTMLTextAreaElement>("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(reason, "Clarify guidance");
      reason.dispatchEvent(new Event("input", { bubbles: true }));
      reason.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mutation.mutateAsync).toHaveBeenCalledWith({
      command: "WITHDRAW_FOR_AMENDMENT",
      expectedRowVersion: call.rowVersion,
      reason: "Clarify guidance",
    });
    expect(mutation.push).toHaveBeenCalledWith(`/admin/funding-calls/${call.id}`);
  });

  it("matches the lifecycle action matrix", async () => {
    await expect(actionsFor("SCHEDULED")).resolves.toEqual([
      "Suspend",
      "Permanently withdraw",
    ]);
    await expect(actionsFor("LIVE")).resolves.toEqual([
      "Suspend",
      "Permanently withdraw",
    ]);
    await expect(actionsFor("SUSPENDED")).resolves.toEqual([
      "Resume",
      "Permanently withdraw",
    ]);
    await expect(actionsFor("CLOSED")).resolves.toEqual(["Archive"]);
    await expect(actionsFor("WITHDRAWN")).resolves.toEqual(["Archive"]);
    await expect(actionsFor("APPROVED")).resolves.toEqual([]);
    await expect(actionsFor("ARCHIVED")).resolves.toEqual([]);
  });
});
