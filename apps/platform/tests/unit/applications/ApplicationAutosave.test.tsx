// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientRequestError } from "@/lib/client-http";
import type { ApplicationDraftView } from "@/modules/applications/ApplicationTypes";
import {
  applicationDraftAutosaveDelayMs,
  useApplicationAutosave,
} from "@/modules/applications/ui/useApplicationAutosave";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useUpdateApplication: () => ({
    error: null,
    isPending: false,
    mutate: mocks.mutate,
  }),
}));

const applicationId = "20000000-0000-4000-8000-000000000001";

function draft(): ApplicationDraftView {
  return {
    businessName: "Example SME",
    businessSection: {},
    createdAt: "2026-09-23T08:00:00.000Z",
    currentSection: "business",
    declarationsSection: {},
    draftResponse: {
      id: "30000000-0000-4000-8000-000000000001",
      rowVersion: 4,
      updatedAt: "2026-09-23T08:00:00.000Z",
      values: { NAME: "Saved" },
    },
    eligibilityRuleSetVersionId: "40000000-0000-4000-8000-000000000001",
    financialSection: {},
    form: {
      fields: [],
      instructions: null,
      sections: [],
      submitLabel: "Submit",
      versionId: "50000000-0000-4000-8000-000000000001",
      versionNumber: 2,
    },
    formVersionId: "50000000-0000-4000-8000-000000000001",
    fundingOpportunityId: "60000000-0000-4000-8000-000000000001",
    fundingOpportunityTitle: "Growth Fund",
    id: applicationId,
    progressPercent: 0,
    projectSection: {},
    rowVersion: 7,
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

function Harness() {
  const autosave = useApplicationAutosave(applicationId, draft());
  return (
    <div>
      <output>{autosave.status}</output>
      <button
        onClick={() => autosave.setValues({ NAME: "Changed" })}
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

describe("application draft autosave", () => {
  it("debounces a versioned save with an idempotency key", async () => {
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("output")?.textContent).toBe("saving");
    await act(async () => {
      vi.advanceTimersByTime(applicationDraftAutosaveDelayMs);
    });
    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        expectedApplicationRowVersion: 7,
        expectedResponseRowVersion: 4,
        idempotencyKey: expect.any(String),
        values: { NAME: "Changed" },
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("shows a conflict instead of reporting the draft as saved", async () => {
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());
    await act(async () => {
      vi.advanceTimersByTime(applicationDraftAutosaveDelayMs);
    });
    const callbacks = mocks.mutate.mock.calls[0][1];
    await act(async () => callbacks.onError(
      new ClientRequestError("Newer draft", 409, { code: "CONFLICT" }),
    ));
    expect(container.querySelector("output")?.textContent).toBe("conflict");
  });

  it("retries a failed save with the same command key", async () => {
    const container = await renderHarness();
    await act(async () => container.querySelector("button")?.click());
    await act(async () => {
      vi.advanceTimersByTime(applicationDraftAutosaveDelayMs);
    });
    const firstInput = mocks.mutate.mock.calls[0][0];
    const callbacks = mocks.mutate.mock.calls[0][1];
    await act(async () => callbacks.onError(new Error("Network failed")));
    expect(container.querySelector("output")?.textContent).toBe("failed");
    await act(async () => {
      const buttons = container.querySelectorAll("button");
      buttons[1]?.click();
    });
    expect(mocks.mutate.mock.calls[1][0].idempotencyKey).toBe(
      firstInput.idempotencyKey,
    );
  });
});
