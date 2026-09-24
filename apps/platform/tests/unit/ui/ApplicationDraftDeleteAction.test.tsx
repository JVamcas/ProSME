// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const deleteDraft = vi.hoisted(() => ({
  error: null,
  isPending: false,
  mutate: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useDeleteApplicationDraft: () => deleteDraft,
}));

import { ApplicationListContent } from "@/components/applicant/applications/ApplicationListContent";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const draft: ApplicationSummary = {
  reference: null,
  submittedAt: null,
  publicStatus: {
    status: "DRAFT",
    label: "Draft",
    description: "Complete and submit your application.",
    actionRequired: false,
  },
  businessName: null,
  createdAt: "2026-09-23T00:00:00.000Z",
  currentSection: "business",
  fundingOpportunityId: "10000000-0000-4000-8000-000000000001",
  fundingOpportunityTitle: "Growth Fund",
  id: "20000000-0000-4000-8000-000000000002",
  progressPercent: 25,
  status: "draft",
  updatedAt: "2026-09-23T00:00:00.000Z",
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("draft deletion action", () => {
  it("requires confirmation before deleting a draft", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ApplicationListContent canDeleteDraft items={[draft]} />);
    });

    const buttons = Array.from(document.querySelectorAll("button"));
    await act(async () => {
      buttons.find((button) => button.title === "Delete draft application")
        ?.click();
    });
    expect(deleteDraft.mutate).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      "Delete your draft for Growth Fund?",
    );

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete draft")
        ?.click();
    });
    expect(deleteDraft.mutate).toHaveBeenCalledWith(
      draft.id,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await act(async () => root.unmount());
  });

  it("does not offer deletion for submitted applications", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ApplicationListContent
          canDeleteDraft
          items={[{ ...draft, status: "submitted" }]}
        />,
      );
    });
    expect(document.querySelector('[title="Delete draft application"]'))
      .toBeNull();
    await act(async () => root.unmount());
  });
});
