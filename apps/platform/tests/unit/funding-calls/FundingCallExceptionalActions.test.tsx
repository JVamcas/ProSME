// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallExceptionalActions } from "@/modules/funding-calls/ui/FundingCallExceptionalActions";

const mutation = vi.hoisted(() => ({
  error: null,
  isPending: false,
  mutateAsync: vi.fn(),
}));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useChangeFundingCallLifecycleStatus: () => mutation,
}));

const call: FundingCallView = {
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

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

async function actionsFor(status: FundingCallView["status"]) {
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
  it("matches the lifecycle action matrix", async () => {
    await expect(actionsFor("SCHEDULED")).resolves.toEqual([
      "Suspend",
      "Withdraw",
    ]);
    await expect(actionsFor("LIVE")).resolves.toEqual([
      "Suspend",
      "Withdraw",
    ]);
    await expect(actionsFor("SUSPENDED")).resolves.toEqual([
      "Resume",
      "Withdraw",
    ]);
    await expect(actionsFor("CLOSED")).resolves.toEqual(["Archive"]);
    await expect(actionsFor("WITHDRAWN")).resolves.toEqual(["Archive"]);
    await expect(actionsFor("APPROVED")).resolves.toEqual([]);
    await expect(actionsFor("ARCHIVED")).resolves.toEqual([]);
  });
});
