// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusinesses: () => ({
    data: [],
    isError: false,
    isPending: false,
  }),
  useBusiness: () => ({ data: undefined }),
  useCreateBusiness: () => ({
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useUpdateBusiness: () => ({
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/modules/applications/ui/useApplicationOpportunityChooser", () => ({
  opportunityChooserPageSize: 10,
  useApplicationOpportunityChooser: () => ({
    query: {
      data: { items: [], total: 0 },
      isError: false,
      isPending: false,
    },
  }),
}));

import { NewApplicationChooser } from "@/modules/applications/ui/NewApplicationChooser";

afterEach(() => {
  document.body.replaceChildren();
});

describe("new application business setup", () => {
  it("opens and closes the existing business form without navigating to a missing route", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => root.render(<NewApplicationChooser />));

      expect(container.textContent).toContain("No business profile found");
      expect(container.querySelector('a[href="/portal/businesses/new"]')).toBeNull();
      expect(document.querySelector('[role="dialog"]')).toBeNull();

      const addButton = Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Add a business");
      expect(addButton).toBeDefined();
      await act(async () => addButton?.click());

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain("Add business");
      expect(
        dialog?.querySelector<HTMLInputElement>('[name="legalName"]')?.value,
      ).toBe("");

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(container.textContent).toContain("No business profile found");
    } finally {
      await act(async () => root.unmount());
    }
  });
});
