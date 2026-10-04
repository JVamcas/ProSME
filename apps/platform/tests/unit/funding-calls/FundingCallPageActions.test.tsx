// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallPageActions } from "@/modules/funding-calls/ui/FundingCallPageActions";

const hookState = vi.hoisted(() => ({
  call: null as FundingCallView | null,
  isPending: false,
  mutate: vi.fn(),
}));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useFundingCall: () => ({ data: hookState.call }),
  usePublishFundingCall: () => ({
    isPending: hookState.isPending,
    mutate: hookState.mutate,
  }),
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
  status: "APPROVED",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: "2026-09-20T08:00:00.000Z",
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};

let root: Root | undefined;

beforeEach(() => {
  hookState.call = call;
  hookState.isPending = false;
  hookState.mutate.mockReset();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("funding call page actions", () => {
  it("offers publication only after approval", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    hookState.call = { ...call, status: "DRAFT" };
    await act(async () => root?.render(
      <FundingCallPageActions canPublish id={call.id} />,
    ));
    expect(container.textContent).not.toContain("Publish");

    hookState.call = call;
    await act(async () => root?.render(
      <FundingCallPageActions canPublish id={call.id} />,
    ));
    const publishButton = container.querySelector("button");
    expect(publishButton?.textContent).toBe("Publish");

    await act(async () => publishButton?.click());
    expect(hookState.mutate).toHaveBeenCalledWith(
      call.rowVersion,
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });
});
