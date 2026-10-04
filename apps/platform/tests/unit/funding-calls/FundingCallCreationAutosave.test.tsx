// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientRequestError } from "@/lib/client-http";
import type { FundingCallCreationProgressValues } from "@/modules/funding-calls/api/FundingCallSchemas";
import {
  fundingCallAutosaveDelayMs,
  useFundingCallCreationAutosave,
} from "@/modules/funding-calls/ui/useFundingCallCreationAutosave";

const mocks = vi.hoisted(() => ({
  error: null as unknown,
  mutateAsync: vi.fn(),
}));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useSaveFundingCallCreationProgress: () => mocks,
}));

function values(title = ""): FundingCallCreationProgressValues {
  return {
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
    title,
    totalBudgetEnvelope: "",
    workflowTemplateVersionId: "",
  };
}

function Harness() {
  const [draftValues, setDraftValues] = useState(values());
  const autosave = useFundingCallCreationAutosave({
    currentStep: "basics",
    enabled: true,
    values: draftValues,
  });
  return (
    <div>
      <output>{autosave.status}</output>
      <button
        onClick={() => setDraftValues(values("Partially entered"))}
        type="button"
      >
        Change
      </button>
      <button onClick={autosave.retry} type="button">Retry</button>
    </div>
  );
}

let root: Root | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.error = null;
  mocks.mutateAsync.mockResolvedValue({
    currentStep: "basics",
    id: "10000000-0000-4000-8000-000000000001",
    rowVersion: 1,
    updatedAt: "2026-09-29T08:00:00.000Z",
    values: values("Partially entered"),
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.useRealTimers();
});

async function renderHarness() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
  return container;
}

describe("funding-call creation autosave", () => {
  it("debounces incomplete values and marks them saved", async () => {
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());

    expect(container.querySelector("output")?.textContent).toBe("saving");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(fundingCallAutosaveDelayMs);
    });

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      currentStep: "basics",
      expectedRowVersion: null,
      values: values("Partially entered"),
    });
    expect(container.querySelector("output")?.textContent).toBe("saved");
  });

  it("warns before leaving while a partial save is pending", async () => {
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("reports a concurrent draft conflict", async () => {
    mocks.mutateAsync.mockRejectedValueOnce(
      new ClientRequestError("Newer draft", 409, { code: "CONFLICT" }),
    );
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(fundingCallAutosaveDelayMs);
    });

    expect(container.querySelector("output")?.textContent).toBe("conflict");
  });
});
